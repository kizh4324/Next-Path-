"""Recommendation and pathway-selection endpoints (FR-05..FR-09, FR-18, FR-20)."""

from __future__ import annotations

from fastapi import APIRouter, status
from sqlalchemy import select

from app.core.dependencies import CurrentStudent, CurrentUser, DbSession
from app.models.recommendation import Recommendation
from app.modules import escalation_service, recommendation_service, roadmap_service
from app.schemas.escalation import ReassessResponse, ReassessTriggerRequest
from app.schemas.recommendation import (
    PathwaySelectRequest,
    PathwaySelectResponse,
    RecommendationBatchResponse,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("/evaluate", response_model=RecommendationBatchResponse)
async def evaluate(
    profile: CurrentStudent, current_user: CurrentUser, db: DbSession
) -> RecommendationBatchResponse:
    """Score the catalogue and persist a new current batch (FR-05).

    Returns 403 for a minor with no recorded guardian consent (FR-20).
    """
    batch = await recommendation_service.evaluate_profile(db, profile)

    # Some situations need a human rather than another round of scoring. Raised here,
    # after the batch exists, so the counselor sees the results the student saw.
    rows = (
        (
            await db.execute(
                select(Recommendation).where(
                    Recommendation.student_id == profile.id,
                    Recommendation.is_current.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    for trigger in escalation_service.evaluate_auto_triggers(profile, list(rows)):
        await escalation_service.create_escalation(
            db, profile, trigger, user=current_user, note="Raised automatically at evaluation."
        )

    return batch


@router.get("/current", response_model=RecommendationBatchResponse)
async def current(profile: CurrentStudent, db: DbSession) -> RecommendationBatchResponse:
    return await recommendation_service.get_current_batch(db, profile.id)


@router.get("/history", response_model=list[RecommendationBatchResponse])
async def history(
    profile: CurrentStudent, db: DbSession
) -> list[RecommendationBatchResponse]:
    """Every cycle including superseded ones — history is never destroyed (FR-18)."""
    return await recommendation_service.get_batch_history(db, profile.id)


@router.post(
    "/select-pathways",
    response_model=PathwaySelectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def select_pathways(
    payload: PathwaySelectRequest, profile: CurrentStudent, db: DbSession
) -> PathwaySelectResponse:
    """Commit to a primary pathway and optional backup, and build the roadmap (FR-09, FR-10)."""
    await recommendation_service.select_pathways(
        db, profile, payload.primary_career_id, payload.backup_career_id
    )
    roadmap = await roadmap_service.create_roadmap(
        db, profile, payload.primary_career_id, payload.backup_career_id
    )
    await db.commit()
    await db.refresh(roadmap, attribute_names=["milestones"])

    return PathwaySelectResponse(
        roadmap_id=roadmap.id,
        primary_career_id=roadmap.primary_career_id,
        backup_career_id=roadmap.backup_career_id,
        milestones_created=len(roadmap.milestones),
        message=(
            "Your pathway is saved and your roadmap is ready. You can change this at any "
            "time — nothing here is locked in."
        ),
    )


@router.post("/reassess", response_model=ReassessResponse)
async def reassess(
    payload: ReassessTriggerRequest, profile: CurrentStudent, db: DbSession
) -> ReassessResponse:
    """Re-run scoring, preserving the previous cycle in full (FR-18)."""
    superseded_batches, superseded_roadmaps = await recommendation_service.supersede_current(
        db, profile.id
    )
    await db.commit()

    batch = await recommendation_service.evaluate_profile(db, profile, supersede_existing=False)
    return ReassessResponse(
        new_batch_id=batch.id,
        new_batch_number=batch.batch_number,
        superseded_batch_ids=list(superseded_batches),
        superseded_roadmap_ids=list(superseded_roadmaps),
        message=(
            "Your new results are ready. Your previous plan and everything you completed "
            "on it are still saved in your history."
        ),
    )
