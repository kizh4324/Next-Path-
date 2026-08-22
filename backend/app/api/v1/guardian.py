"""Guardian summary endpoints (FR-17)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentStudent, DbSession
from app.modules import parent_summary_service
from app.schemas.parent_summary import ParentSummaryResponse

router = APIRouter(prefix="/guardian", tags=["Guardian"])


@router.get("/summary", response_model=ParentSummaryResponse)
async def summary(
    profile: CurrentStudent,
    db: DbSession,
    regenerate: bool = Query(
        default=False,
        description=(
            "Force a fresh generation. Off by default so the stored wording is returned "
            "verbatim and never drifts between visits."
        ),
    ),
) -> ParentSummaryResponse:
    """Plain-language summary for a parent or guardian, with a cost breakdown and
    shared discussion points."""
    return await parent_summary_service.generate_or_get_summary(db, profile, regenerate)
