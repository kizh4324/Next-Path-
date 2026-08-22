"""Registration, login, and minor-consent recording (FR-20, Story 1.4)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.profile import GuardianContext, StudentProfile
from app.models.user import User
from app.schemas.auth import (
    ConsentResponse,
    LoginRequest,
    MinorConsentRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.enums import ConsentType, UserRole

logger = logging.getLogger(__name__)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


def _issue_token(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        expires_in_minutes=settings.access_token_expire_minutes,
        user_id=user.id,
        role=UserRole(user.role),
        full_name=user.full_name,
    )


async def register_user(db: AsyncSession, payload: RegisterRequest) -> TokenResponse:
    if await get_user_by_email(db, payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role.value,
        full_name=payload.full_name.strip(),
        phone_number=payload.phone_number,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("Registered user %s with role %s", user.id, user.role)
    return _issue_token(user)


async def authenticate_user(db: AsyncSession, payload: LoginRequest) -> TokenResponse:
    user = await get_user_by_email(db, payload.email)
    # One message for both failure modes: distinguishing them tells an attacker which
    # emails are registered.
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
    )
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise invalid
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )
    return _issue_token(user)


async def record_minor_consent(
    db: AsyncSession,
    payload: MinorConsentRequest,
    acting_user: User,
) -> ConsentResponse:
    """Record a guardian's consent for a minor's profile.

    Consent is only ever recorded from an explicit, confirmed submission by an account
    that is not the student's own — a minor cannot consent on their own behalf, which
    is the entire point of the gate (FR-20, PRD Section 16).
    """
    profile = await db.get(StudentProfile, payload.student_profile_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found."
        )

    if not profile.is_minor_stage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This student is in the early-college stage and self-consents. "
                "Guardian consent is not required."
            ),
        )

    guardian = await get_user_by_email(db, payload.guardian_email)
    if guardian is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No account exists for this guardian email. The guardian must register "
                "an account before consent can be recorded against it."
            ),
        )

    if guardian.id == profile.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student cannot record guardian consent for their own profile.",
        )

    # The acting caller must be either the guardian themselves or a counselor recording
    # consent collected offline. A student cannot submit this on a guardian's behalf.
    if acting_user.id != guardian.id and acting_user.role not in ("counselor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Consent must be submitted by the guardian's own account, or recorded "
                "by a counselor."
            ),
        )

    profile.consent_type = ConsentType.GUARDIAN_CONSENT_MINOR.value
    profile.consent_given_by = guardian.id
    profile.consent_recorded_at = datetime.now(UTC)

    existing = await db.execute(
        select(GuardianContext).where(
            GuardianContext.student_id == profile.id,
            GuardianContext.relationship_to_student == payload.relationship_to_student,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(
            GuardianContext(
                student_id=profile.id,
                guardian_name=payload.guardian_full_name,
                relationship_to_student=payload.relationship_to_student,
            )
        )

    if payload.guardian_phone and not guardian.phone_number:
        guardian.phone_number = payload.guardian_phone

    await db.commit()
    await db.refresh(profile)
    logger.info("Recorded guardian consent for profile %s by user %s", profile.id, guardian.id)

    return ConsentResponse(
        student_profile_id=profile.id,
        consent_type=profile.consent_type,
        consent_given_by=profile.consent_given_by,
        consent_recorded_at=profile.consent_recorded_at,
        message=(
            "Guardian consent recorded. Career recommendations are now unlocked for "
            "this student."
        ),
    )


def assert_consent_for_recommendations(profile: StudentProfile) -> None:
    """Gate recommendation generation on recorded consent (FR-20, Story 2.3).

    Raises 403 with the exact message the acceptance criteria specify.
    """
    if profile.is_minor_stage and not profile.has_valid_minor_consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guardian consent is required for minors before generating recommendations",
        )
