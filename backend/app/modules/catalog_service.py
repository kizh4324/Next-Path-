"""Career library, comparison, and scholarship queries (FR-04, FR-08, FR-13, FR-14)."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import CareerLibrary, MarketSnapshot, Scholarship
from app.schemas.catalog import (
    CareerCompareResponse,
    CareerDetailDTO,
    CareerSummaryDTO,
    ComparisonRow,
    MarketSnapshotDTO,
    ScholarshipDTO,
    ScholarshipListResponse,
)
from app.schemas.common import EvidenceUnavailable

# Shown wherever a career has no dataset-derived market snapshot. The wording is
# deliberate: absence of evidence must not read as evidence of weak demand.
MARKET_EVIDENCE_UNAVAILABLE = EvidenceUnavailable(
    reason=(
        "We have no dated job-market data for this career. Our market evidence comes "
        "from a sample of job postings that covered data science and data analytics "
        "roles only."
    ),
    what_would_help=(
        "A dated postings sample or official employment survey covering this field "
        "would let us show demand and salary information here. Until then, ask a "
        "counselor or someone working in the field."
    ),
)


async def get_career_or_404(db: AsyncSession, career_id: str) -> CareerLibrary:
    result = await db.execute(
        select(CareerLibrary)
        .where(CareerLibrary.id == career_id)
        .options(
            selectinload(CareerLibrary.skills),
            selectinload(CareerLibrary.market_snapshots),
        )
    )
    career = result.scalar_one_or_none()
    if career is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Career '{career_id}' not found."
        )
    return career


def _latest_snapshot(career: CareerLibrary) -> MarketSnapshot | None:
    if not career.market_snapshots:
        return None
    return max(career.market_snapshots, key=lambda s: s.last_updated_date)


def to_detail_dto(career: CareerLibrary) -> CareerDetailDTO:
    snapshot = _latest_snapshot(career)
    dto = CareerDetailDTO.model_validate(career)
    # Exactly one of these is ever populated, so the UI cannot render both a snapshot
    # and a missing-evidence notice for the same career.
    if snapshot is not None:
        dto.market_snapshot = MarketSnapshotDTO.model_validate(snapshot)
        dto.market_evidence_unavailable = None
    else:
        dto.market_snapshot = None
        dto.market_evidence_unavailable = MARKET_EVIDENCE_UNAVAILABLE
    # Sort so essential skills lead — that is the order a student needs them in.
    order = {"essential": 0, "useful": 1, "optional": 2}
    dto.skills.sort(key=lambda s: (order.get(s.category.value, 9), s.skill_name))
    return dto


async def list_careers(
    db: AsyncSession, stage: str | None = None, cluster: str | None = None
) -> list[CareerSummaryDTO]:
    statement = select(CareerLibrary).order_by(CareerLibrary.title)
    if cluster:
        statement = statement.where(CareerLibrary.cluster == cluster)
    careers = (await db.execute(statement)).scalars().all()

    summaries = [CareerSummaryDTO.model_validate(c) for c in careers]
    if stage:
        # Filtered in Python rather than SQL: the JSONB containment operator has no
        # portable equivalent, and the catalogue is small enough that it does not matter.
        summaries = [s for s in summaries if stage in [x.value for x in s.applicable_stages]]
    return summaries


def _cost_range(career: CareerSummaryDTO) -> str:
    if not career.india_entry_routes:
        return "Not recorded"
    low = min(r.estimated_cost_inr_min for r in career.india_entry_routes)
    high = max(r.estimated_cost_inr_max for r in career.india_entry_routes)
    return f"₹{low:,} - ₹{high:,} total"


def _exam_list(career: CareerSummaryDTO) -> str:
    exams: list[str] = []
    for route in career.india_entry_routes:
        for exam in route.entrance_exams:
            if exam not in exams:
                exams.append(exam)
    return ", ".join(exams) if exams else "No entrance exam required"


def _duration(career: CareerSummaryDTO) -> str:
    if not career.india_entry_routes:
        return "Not recorded"
    years = [r.duration_years for r in career.india_entry_routes]
    return f"{min(years)}-{max(years)} years" if min(years) != max(years) else f"{min(years)} years"


def _cheapest_route(career: CareerSummaryDTO) -> str:
    if not career.india_entry_routes:
        return "Not recorded"
    route = min(career.india_entry_routes, key=lambda r: r.estimated_cost_inr_min)
    return f"{route.route_name} (₹{route.estimated_cost_inr_min:,}+)"


async def compare_careers(db: AsyncSession, career_ids: list[str]) -> CareerCompareResponse:
    """Side-by-side comparison across the dimensions a student actually decides on."""
    careers: list[CareerLibrary] = []
    for career_id in career_ids:
        careers.append(await get_career_or_404(db, career_id))

    summaries = [CareerSummaryDTO.model_validate(c) for c in careers]
    by_id = dict(zip(career_ids, summaries, strict=True))
    snapshots = {c.id: _latest_snapshot(c) for c in careers}
    without_evidence = [cid for cid, snap in snapshots.items() if snap is None]

    rows: list[ComparisonRow] = [
        ComparisonRow(
            dimension="Entrance exams",
            values={cid: _exam_list(c) for cid, c in by_id.items()},
        ),
        ComparisonRow(
            dimension="Estimated total cost",
            values={cid: _cost_range(c) for cid, c in by_id.items()},
            note=(
                "Total programme cost, not annual. Ranges are wide because fees vary by "
                "state, institution, and admission quota."
            ),
        ),
        ComparisonRow(
            dimension="Time to qualify",
            values={cid: _duration(c) for cid, c in by_id.items()},
        ),
        ComparisonRow(
            dimension="Cheapest route we know of",
            values={cid: _cheapest_route(c) for cid, c in by_id.items()},
        ),
        ComparisonRow(
            dimension="Preparation depth (O*NET Job Zone 1-5)",
            values={cid: f"Zone {c.job_zone}" for cid, c in by_id.items()},
        ),
        ComparisonRow(
            dimension="Market demand",
            values={
                cid: (snap.demand_indicator if (snap := snapshots.get(cid)) else "No verified evidence")
                for cid in by_id
            },
            note=(
                "Demand is shown only where we hold dated source data. "
                "'No verified evidence' means we do not know, not that demand is low."
            ),
        ),
        ComparisonRow(
            dimension="Competition caveat",
            values={
                cid: (
                    snap.competition_caveat
                    if (snap := snapshots.get(cid))
                    else "Not available for this career."
                )
                for cid in by_id
            },
        ),
        ComparisonRow(
            dimension="Main risks",
            values={
                cid: " ".join(f"• {r}" for r in c.risks_and_tradeoffs) or "None recorded"
                for cid, c in by_id.items()
            },
        ),
    ]

    return CareerCompareResponse(
        careers=summaries, rows=rows, careers_without_market_evidence=without_evidence
    )


async def search_scholarships(
    db: AsyncSession,
    state: str | None = None,
    target_category: str | None = None,
    min_qualification: str | None = None,
    max_income_inr: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> ScholarshipListResponse:
    statement = select(Scholarship).where(Scholarship.is_active.is_(True))

    if state:
        # "All India" schemes are available to every state applicant, so a state filter
        # must include them or it would hide the most widely available options.
        statement = statement.where(
            func.lower(Scholarship.state).in_([state.lower(), "all india"])
        )
    if target_category:
        statement = statement.where(
            func.lower(Scholarship.target_category).in_([target_category.lower(), "all"])
        )
    if min_qualification:
        statement = statement.where(
            func.lower(Scholarship.min_qualification).contains(min_qualification.lower())
        )
    if max_income_inr is not None:
        # income_ceiling_inr == 0 means "no ceiling", so those always qualify.
        statement = statement.where(
            (Scholarship.income_ceiling_inr == 0)
            | (Scholarship.income_ceiling_inr >= max_income_inr)
        )

    total = (
        await db.execute(select(func.count()).select_from(statement.subquery()))
    ).scalar_one()
    rows = (
        await db.execute(statement.order_by(Scholarship.name).limit(limit).offset(offset))
    ).scalars().all()

    states = (
        await db.execute(select(Scholarship.state).distinct().order_by(Scholarship.state))
    ).scalars().all()

    return ScholarshipListResponse(
        total=int(total),
        results=[ScholarshipDTO.model_validate(r) for r in rows],
        coverage_note=(
            f"Our scholarship catalogue currently covers {', '.join(states)} only. "
            "An empty result means the scheme is not in our data, not that no scheme "
            "exists — check scholarships.gov.in for the full national list."
        ),
    )


async def get_scholarship_or_404(db: AsyncSession, scholarship_id: int) -> ScholarshipDTO:
    scholarship = await db.get(Scholarship, scholarship_id)
    if scholarship is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scholarship not found."
        )
    return ScholarshipDTO.model_validate(scholarship)
