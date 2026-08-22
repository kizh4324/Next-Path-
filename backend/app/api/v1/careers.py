"""Career library and comparison endpoints (FR-04, FR-08, FR-11, FR-14)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentStudent, DbSession
from app.modules import catalog_service, roadmap_service
from app.schemas.catalog import (
    CareerCompareRequest,
    CareerCompareResponse,
    CareerDetailDTO,
    CareerSummaryDTO,
)
from app.schemas.roadmap import SkillGapResponse

router = APIRouter(prefix="/careers", tags=["Career Library"])


@router.get("", response_model=list[CareerSummaryDTO])
async def list_careers(
    db: DbSession,
    stage: str | None = Query(default=None, description="Filter by education stage"),
    cluster: str | None = Query(default=None, description="Filter by cluster"),
) -> list[CareerSummaryDTO]:
    return await catalog_service.list_careers(db, stage=stage, cluster=cluster)


@router.post("/compare", response_model=CareerCompareResponse)
async def compare(payload: CareerCompareRequest, db: DbSession) -> CareerCompareResponse:
    """Compare 2-3 careers side by side (FR-08).

    Careers with no dataset-derived market evidence are named explicitly in the
    response rather than shown with a blank cell.
    """
    return await catalog_service.compare_careers(db, payload.career_ids)


@router.get("/{career_id}", response_model=CareerDetailDTO)
async def career_detail(career_id: str, db: DbSession) -> CareerDetailDTO:
    """Full career record including skills and market evidence, or an explicit
    missing-evidence state where no verified data exists (FR-04, FR-14)."""
    career = await catalog_service.get_career_or_404(db, career_id)
    return catalog_service.to_detail_dto(career)


@router.get("/{career_id}/skill-gaps", response_model=SkillGapResponse)
async def skill_gaps(
    career_id: str, profile: CurrentStudent, db: DbSession
) -> SkillGapResponse:
    """Skills split into essential / useful / optional, each with a free route (FR-11, FR-12)."""
    return await roadmap_service.get_skill_gaps(db, profile, career_id)
