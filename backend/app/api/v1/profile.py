"""Profile and onboarding endpoints (FR-01, FR-02, FR-03)."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.core.config import settings
from app.core.dependencies import CurrentStudent, CurrentUser, DbSession
from app.modules import profile_service
from app.schemas.profile import (
    GuardianContextCreate,
    GuardianContextResponse,
    ProfileStatusResponse,
    StudentProfileCreate,
    StudentProfileResponse,
    StudentProfileUpdate,
)

router = APIRouter(prefix="/profile", tags=["Profile & Onboarding"])


@router.post("", response_model=StudentProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    payload: StudentProfileCreate, current_user: CurrentUser, db: DbSession
) -> StudentProfileResponse:
    """Submit the onboarding questionnaire.

    Academic marks are not required. A student who will not or cannot share them still
    gets a full result, with the gap reflected in evidence quality (FR-01).
    """
    profile = await profile_service.create_or_update_profile(db, current_user, payload)
    return StudentProfileResponse.model_validate(profile)


@router.get("", response_model=StudentProfileResponse)
async def read_profile(profile: CurrentStudent) -> StudentProfileResponse:
    return StudentProfileResponse.model_validate(profile)


@router.patch("", response_model=StudentProfileResponse)
async def update_profile(
    payload: StudentProfileUpdate, profile: CurrentStudent, db: DbSession
) -> StudentProfileResponse:
    updated = await profile_service.patch_profile(db, profile, payload)
    return StudentProfileResponse.model_validate(updated)


@router.get("/status", response_model=ProfileStatusResponse)
async def profile_status(current_user: CurrentUser, db: DbSession) -> ProfileStatusResponse:
    """Which gate the frontend should show next: onboarding, consent, or results."""
    profile = await profile_service.get_profile_for_user(db, current_user.id)
    return profile_service.build_status(profile, settings.min_profile_completeness_pct)


@router.post(
    "/guardian",
    response_model=GuardianContextResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_guardian(
    payload: GuardianContextCreate, profile: CurrentStudent, db: DbSession
) -> GuardianContextResponse:
    """Record guardian priorities and constraints (FR-03).

    Separate from consent: a guardian's budget ceiling shapes the scoring even when the
    student is an adult who consents for themselves.
    """
    context = await profile_service.upsert_guardian_context(db, profile, payload)
    return GuardianContextResponse.model_validate(context)
