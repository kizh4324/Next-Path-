"""Student and guardian profile management (FR-01, FR-02, FR-03)."""

from __future__ import annotations

import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.profile import GuardianContext, StudentProfile
from app.models.user import User
from app.schemas.enums import ConsentType, EducationStage
from app.schemas.profile import (
    COMPLETENESS_WEIGHTS,
    GuardianContextCreate,
    ProfileStatusResponse,
    StudentProfileCreate,
    StudentProfileUpdate,
)

logger = logging.getLogger(__name__)


def calculate_completeness(profile: StudentProfile) -> int:
    """Weighted completeness percentage feeding the Evidence Quality score.

    Weights live in COMPLETENESS_WEIGHTS so the calculation is one reviewable table
    rather than a chain of conditionals.
    """
    earned = 0
    weights = COMPLETENESS_WEIGHTS

    if profile.education_stage:
        earned += weights["education_stage"]
    if profile.grade_or_year:
        earned += weights["grade_or_year"]
    if profile.interests:
        earned += weights["interests"]
    if profile.aptitude_signals:
        earned += weights["aptitude_signals"]
    if profile.work_style_preferences:
        earned += weights["work_style_preferences"]
    if profile.budget_tier:
        earned += weights["budget_tier"]
    if profile.relocation_willingness:
        earned += weights["relocation_willingness"]
    if profile.guardian_contexts:
        earned += weights["guardian_context"]
    if profile.academic_records_available:
        earned += weights["academic_records"]

    return min(100, earned)


async def _load_profile(db: AsyncSession, profile_id: object) -> StudentProfile:
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == profile_id)
        .options(selectinload(StudentProfile.guardian_contexts))
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return profile


async def get_profile_for_user(db: AsyncSession, user_id: object) -> StudentProfile | None:
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.user_id == user_id)
        .options(selectinload(StudentProfile.guardian_contexts))
    )
    return result.scalar_one_or_none()


async def create_or_update_profile(
    db: AsyncSession, user: User, payload: StudentProfileCreate
) -> StudentProfile:
    """Create the profile, or overwrite it if onboarding is being redone.

    Consent is deliberately NOT set here. A minor's profile is created with the
    guardian-consent type and a null `consent_given_by`, which leaves the recommendation
    gate closed until a guardian actually records consent (FR-20).
    """
    profile = await get_profile_for_user(db, user.id)
    is_minor = payload.education_stage in (
        EducationStage.CLASS_8_10,
        EducationStage.CLASS_11_12,
    )

    if profile is None:
        profile = StudentProfile(
            user_id=user.id,
            education_stage=payload.education_stage.value,
            consent_type=(
                ConsentType.GUARDIAN_CONSENT_MINOR.value
                if is_minor
                else ConsentType.SELF_CONSENT_ADULT.value
            ),
            consent_given_by=None,
            grade_or_year=payload.grade_or_year,
        )
        db.add(profile)
    else:
        # If the stage changes across a re-onboarding, the consent basis changes with
        # it — moving into a minor stage must re-close the gate.
        if profile.education_stage != payload.education_stage.value:
            profile.education_stage = payload.education_stage.value
            if is_minor:
                profile.consent_type = ConsentType.GUARDIAN_CONSENT_MINOR.value
                profile.consent_given_by = None
            else:
                profile.consent_type = ConsentType.SELF_CONSENT_ADULT.value

    profile.grade_or_year = payload.grade_or_year
    profile.current_stream = payload.current_stream
    profile.interests = [entry.model_dump() for entry in payload.interests]
    profile.aptitude_signals = payload.aptitude_signals
    profile.work_style_preferences = payload.work_style_preferences
    profile.budget_tier = payload.budget_tier.value
    profile.relocation_willingness = payload.relocation_willingness.value
    profile.preferred_languages = payload.preferred_languages
    profile.academic_records_available = payload.academic_records_available

    await db.flush()
    await db.refresh(profile, attribute_names=["guardian_contexts"])
    profile.profile_completeness_pct = calculate_completeness(profile)
    await db.commit()
    await db.refresh(profile)
    logger.info(
        "Saved profile %s (%s%% complete)", profile.id, profile.profile_completeness_pct
    )
    return await _load_profile(db, profile.id)


async def patch_profile(
    db: AsyncSession, profile: StudentProfile, payload: StudentProfileUpdate
) -> StudentProfile:
    data = payload.model_dump(exclude_unset=True)
    if "interests" in data and data["interests"] is not None:
        data["interests"] = [
            entry.model_dump() if hasattr(entry, "model_dump") else entry
            for entry in payload.interests or []
        ]
    for key, value in data.items():
        if value is None:
            continue
        setattr(profile, key, value.value if hasattr(value, "value") else value)

    await db.flush()
    await db.refresh(profile, attribute_names=["guardian_contexts"])
    profile.profile_completeness_pct = calculate_completeness(profile)
    await db.commit()
    return await _load_profile(db, profile.id)


async def upsert_guardian_context(
    db: AsyncSession, profile: StudentProfile, payload: GuardianContextCreate
) -> GuardianContext:
    result = await db.execute(
        select(GuardianContext).where(
            GuardianContext.student_id == profile.id,
            GuardianContext.relationship_to_student == payload.relationship_to_student,
        )
    )
    context = result.scalar_one_or_none()

    if context is None:
        context = GuardianContext(student_id=profile.id, **payload.model_dump(
            exclude={"relocation_restriction"}
        ), relocation_restriction=payload.relocation_restriction.value)
        db.add(context)
    else:
        context.guardian_name = payload.guardian_name
        context.guardian_priorities = payload.guardian_priorities
        context.financial_ceiling_inr = payload.financial_ceiling_inr
        context.relocation_restriction = payload.relocation_restriction.value
        context.notes_and_concerns = payload.notes_and_concerns

    await db.flush()
    await db.refresh(profile, attribute_names=["guardian_contexts"])
    profile.profile_completeness_pct = calculate_completeness(profile)
    await db.commit()
    await db.refresh(context)
    return context


def build_status(profile: StudentProfile | None, min_completeness: int) -> ProfileStatusResponse:
    """What the frontend needs to decide which gate to show next."""
    if profile is None:
        return ProfileStatusResponse(
            profile_exists=False,
            profile_completeness_pct=0,
            is_minor_stage=False,
            consent_required=False,
            consent_recorded=False,
            can_generate_recommendations=False,
            blocking_reason="Complete onboarding to see your career options.",
        )

    consent_required = profile.is_minor_stage
    consent_recorded = profile.has_valid_minor_consent if consent_required else True

    blocking_reason: str | None = None
    if consent_required and not consent_recorded:
        blocking_reason = (
            "A parent or guardian needs to give consent before we can generate "
            "recommendations for you."
        )
    elif profile.profile_completeness_pct < min_completeness:
        blocking_reason = (
            f"Your profile is {profile.profile_completeness_pct}% complete. We need at "
            f"least {min_completeness}% before the results would mean anything."
        )

    return ProfileStatusResponse(
        profile_exists=True,
        profile_completeness_pct=profile.profile_completeness_pct,
        is_minor_stage=profile.is_minor_stage,
        consent_required=consent_required,
        consent_recorded=consent_recorded,
        can_generate_recommendations=blocking_reason is None,
        blocking_reason=blocking_reason,
    )
