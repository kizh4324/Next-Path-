"""Roadmap execution endpoints (FR-10, FR-11, FR-12)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from app.core.dependencies import CurrentStudent, DbSession
from app.modules import roadmap_service
from app.schemas.roadmap import MilestoneCompleteRequest, MilestoneDTO, RoadmapResponse

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])


@router.get("", response_model=RoadmapResponse)
async def current_roadmap(profile: CurrentStudent, db: DbSession) -> RoadmapResponse:
    """The active 30/90/180-day plan with per-milestone lock state."""
    return await roadmap_service.get_current_roadmap(db, profile.id)


@router.patch("/milestones/{milestone_id}/complete", response_model=MilestoneDTO)
async def complete_milestone(
    milestone_id: uuid.UUID,
    payload: MilestoneCompleteRequest,
    profile: CurrentStudent,
    db: DbSession,
) -> MilestoneDTO:
    """Mark a milestone done, with proof where the evidence type requires it."""
    return await roadmap_service.complete_milestone(db, profile.id, milestone_id, payload)
