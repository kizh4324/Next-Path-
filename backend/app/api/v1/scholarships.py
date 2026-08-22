"""Scholarship search endpoints (FR-13)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.dependencies import DbSession
from app.modules import catalog_service
from app.schemas.catalog import ScholarshipDTO, ScholarshipListResponse

router = APIRouter(prefix="/scholarships", tags=["Scholarships"])


@router.get("", response_model=ScholarshipListResponse)
async def search(
    db: DbSession,
    state: str | None = Query(default=None, description="State; All-India schemes always included"),
    target_category: str | None = Query(default=None, description="e.g. SC, ST, OBC, Minority, PWD"),
    min_qualification: str | None = Query(default=None, description="e.g. 12th, Graduation"),
    max_income_inr: int | None = Query(
        default=None, ge=0, description="Your annual family income, in INR"
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ScholarshipListResponse:
    """Search verified scholarships.

    Every result carries its eligibility, deadline, required documents, official portal
    link, and verification date. The response also states which jurisdictions the
    catalogue covers, so an empty result reads as "not in our data" rather than
    "no scheme exists".
    """
    return await catalog_service.search_scholarships(
        db,
        state=state,
        target_category=target_category,
        min_qualification=min_qualification,
        max_income_inr=max_income_inr,
        limit=limit,
        offset=offset,
    )


@router.get("/{scholarship_id}", response_model=ScholarshipDTO)
async def detail(scholarship_id: int, db: DbSession) -> ScholarshipDTO:
    return await catalog_service.get_scholarship_or_404(db, scholarship_id)
