"""Recommendation batching and persistence (FR-05, FR-09, FR-18, Story 2.3).

The engine in `scoring_engine` stays pure; this module is the only place that reads the
catalogue out of Postgres, feeds it in, and writes the results back.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.catalog import CareerLibrary
from app.models.profile import StudentProfile
from app.models.recommendation import Recommendation, RecommendationBatch
from app.models.roadmap import Roadmap
from app.modules.auth_service import assert_consent_for_recommendations
from app.modules.scoring_engine import (
    CareerScoringInput,
    StudentScoringProfile,
    build_riasec_vector,
    rank_careers,
)
from app.schemas.enums import BudgetTier, RelocationWillingness
from app.schemas.recommendation import (
    RecommendationBatchResponse,
    RecommendationDTO,
    ScoredCareerPreview,
)

logger = logging.getLogger(__name__)


def build_scoring_profile(profile: StudentProfile) -> StudentScoringProfile:
    """Flatten a profile row (plus guardian constraints) into engine input."""
    guardian_ceiling: int | None = None
    guardian_relocation: RelocationWillingness | None = None

    for context in profile.guardian_contexts:
        if context.financial_ceiling_inr is not None:
            guardian_ceiling = (
                context.financial_ceiling_inr
                if guardian_ceiling is None
                else min(guardian_ceiling, context.financial_ceiling_inr)
            )
        try:
            restriction = RelocationWillingness(context.relocation_restriction)
        except ValueError:
            continue
        guardian_relocation = restriction if guardian_relocation is None else min(
            guardian_relocation, restriction, key=lambda r: _relocation_rank(r)
        )

    return StudentScoringProfile(
        education_stage=profile.education_stage,
        current_stream=profile.current_stream,
        riasec_vector=build_riasec_vector(list(profile.interests or [])),
        aptitude_signals=dict(profile.aptitude_signals or {}),
        budget_tier=BudgetTier(profile.budget_tier),
        relocation_willingness=RelocationWillingness(profile.relocation_willingness),
        profile_completeness_pct=profile.profile_completeness_pct,
        academic_records_available=profile.academic_records_available,
        guardian_financial_ceiling_inr=guardian_ceiling,
        guardian_relocation_restriction=guardian_relocation,
    )


def _relocation_rank(value: RelocationWillingness) -> int:
    from app.schemas.enums import RELOCATION_ORDER

    return RELOCATION_ORDER[value]


def to_scoring_input(career: CareerLibrary, has_market_evidence: bool) -> CareerScoringInput:
    essential = [s.skill_name for s in career.skills if s.category == "essential"]
    routes: list[dict[str, Any]] = list(career.india_entry_routes or [])
    # A career counts as having a funded route when any route names a low-cost
    # alternative — this softens the budget penalty rather than zeroing it.
    has_funded = any(r.get("low_cost_alternative_route") for r in routes)

    return CareerScoringInput(
        career_id=career.id,
        title=career.title,
        cluster=career.cluster,
        job_zone=career.job_zone,
        riasec_scores=dict(career.riasec_scores or {}),
        applicable_stages=list(career.applicable_stages or []),
        entry_routes=routes,
        prerequisites=list(career.prerequisites or []),
        risks_and_tradeoffs=list(career.risks_and_tradeoffs or []),
        essential_skills=essential,
        has_market_evidence=has_market_evidence,
        has_funded_route=has_funded,
    )


async def _load_catalogue(db: AsyncSession) -> list[CareerScoringInput]:
    careers = (
        (
            await db.execute(
                select(CareerLibrary).options(
                    selectinload(CareerLibrary.skills),
                    selectinload(CareerLibrary.market_snapshots),
                )
            )
        )
        .scalars()
        .all()
    )
    if not careers:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The career catalogue is empty. Run `python -m data.seed_runner` before "
                "generating recommendations."
            ),
        )
    return [to_scoring_input(c, bool(c.market_snapshots)) for c in careers]


async def _next_batch_number(db: AsyncSession, student_id: object) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(RecommendationBatch.batch_number), 0)).where(
            RecommendationBatch.student_id == student_id
        )
    )
    return int(result.scalar_one()) + 1


async def supersede_current(db: AsyncSession, student_id: object) -> tuple[list[Any], list[Any]]:
    """Soft-supersede the active cycle. History is preserved, never deleted (FR-18)."""
    now = datetime.now(UTC)

    batch_ids = (
        (
            await db.execute(
                select(RecommendationBatch.id).where(
                    RecommendationBatch.student_id == student_id,
                    RecommendationBatch.is_current.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    roadmap_ids = (
        (
            await db.execute(
                select(Roadmap.id).where(
                    Roadmap.student_id == student_id, Roadmap.is_current.is_(True)
                )
            )
        )
        .scalars()
        .all()
    )

    if batch_ids:
        await db.execute(
            update(RecommendationBatch)
            .where(RecommendationBatch.id.in_(batch_ids))
            .values(is_current=False, superseded_at=now)
        )
        await db.execute(
            update(Recommendation)
            .where(Recommendation.batch_id.in_(batch_ids))
            .values(is_current=False, superseded_at=now)
        )
    if roadmap_ids:
        await db.execute(
            update(Roadmap)
            .where(Roadmap.id.in_(roadmap_ids))
            .values(is_current=False, superseded_at=now, status="reassessing")
        )

    return list(batch_ids), list(roadmap_ids)


def _persist_scored(
    batch: RecommendationBatch, student_id: object, scored: list[ScoredCareerPreview]
) -> list[Recommendation]:
    rows: list[Recommendation] = []
    for position, item in enumerate(scored, start=1):
        rows.append(
            Recommendation(
                batch_id=batch.id,
                student_id=student_id,
                career_id=item.career_id,
                career_title=item.career_title,
                rank_position=position,
                composite_score=Decimal(str(item.composite_score)),
                fit_score=Decimal(str(item.fit_score)),
                feasibility_score=Decimal(str(item.feasibility_score)),
                evidence_quality_score=Decimal(str(item.evidence_quality_score)),
                fit_label=item.fit_label.value,
                feasibility_label=item.feasibility_label.value,
                evidence_quality_label=item.evidence_quality_label.value,
                reasons=item.reasons,
                concerns=item.concerns,
                missing_evidence_flags=item.missing_evidence_flags,
            )
        )
    return rows


async def evaluate_profile(
    db: AsyncSession, profile: StudentProfile, supersede_existing: bool = True
) -> RecommendationBatchResponse:
    """Score the catalogue and persist a new current batch (FR-05, FR-20)."""
    # Consent gate first: an unconsented minor must not have their data scored at all,
    # not merely be prevented from seeing the output.
    assert_consent_for_recommendations(profile)

    if profile.profile_completeness_pct < settings.min_profile_completeness_pct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Student profile must be at least "
                f"{settings.min_profile_completeness_pct}% complete before running "
                f"evaluation. Yours is {profile.profile_completeness_pct}%."
            ),
        )

    catalogue = await _load_catalogue(db)
    student = build_scoring_profile(profile)
    scored = rank_careers(student, catalogue)

    if not scored:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No career options could be scored from your profile.",
        )

    if supersede_existing:
        await supersede_current(db, profile.id)

    batch = RecommendationBatch(
        student_id=profile.id,
        batch_number=await _next_batch_number(db, profile.id),
        is_current=True,
    )
    db.add(batch)
    await db.flush()

    for row in _persist_scored(batch, profile.id, scored):
        db.add(row)

    await db.commit()
    logger.info(
        "Evaluated profile %s: batch %s with %d options",
        profile.id,
        batch.batch_number,
        len(scored),
    )
    return await get_current_batch(db, profile.id)


def _batch_loader_options() -> Any:
    """Eager-load recommendations and their careers.

    Required, not an optimization: Pydantic reads `Recommendation.career` during
    validation, and a lazy load at that point raises MissingGreenlet under an async
    session.
    """
    return selectinload(RecommendationBatch.recommendations).selectinload(
        Recommendation.career
    )


async def get_current_batch(db: AsyncSession, student_id: object) -> RecommendationBatchResponse:
    result = await db.execute(
        select(RecommendationBatch)
        .where(
            RecommendationBatch.student_id == student_id,
            RecommendationBatch.is_current.is_(True),
        )
        .options(_batch_loader_options())
        .order_by(RecommendationBatch.batch_number.desc())
    )
    batch = result.scalars().first()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current recommendations. Run an evaluation first.",
        )
    return RecommendationBatchResponse.model_validate(batch)


async def get_batch_history(
    db: AsyncSession, student_id: object
) -> list[RecommendationBatchResponse]:
    """Every cycle, newest first — superseded batches included (FR-18)."""
    batches = (
        (
            await db.execute(
                select(RecommendationBatch)
                .where(RecommendationBatch.student_id == student_id)
                .options(_batch_loader_options())
                .order_by(RecommendationBatch.batch_number.desc())
            )
        )
        .scalars()
        .all()
    )
    return [RecommendationBatchResponse.model_validate(b) for b in batches]


async def select_pathways(
    db: AsyncSession,
    profile: StudentProfile,
    primary_career_id: str,
    backup_career_id: str | None,
) -> tuple[RecommendationBatch, list[Recommendation]]:
    """Mark the chosen primary and backup within the current batch (FR-09)."""
    result = await db.execute(
        select(RecommendationBatch)
        .where(
            RecommendationBatch.student_id == profile.id,
            RecommendationBatch.is_current.is_(True),
        )
        .options(selectinload(RecommendationBatch.recommendations))
    )
    batch = result.scalars().first()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current recommendation batch. Run an evaluation first.",
        )

    by_career = {r.career_id: r for r in batch.recommendations}
    if primary_career_id not in by_career:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"'{primary_career_id}' is not among your current recommendations. "
                "You can only select from options that were actually scored for you."
            ),
        )
    if backup_career_id is not None and backup_career_id not in by_career:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{backup_career_id}' is not among your current recommendations.",
        )

    for recommendation in batch.recommendations:
        recommendation.is_primary_selection = recommendation.career_id == primary_career_id
        recommendation.is_backup_selection = (
            backup_career_id is not None and recommendation.career_id == backup_career_id
        )

    await db.flush()
    return batch, list(batch.recommendations)


def to_dto(recommendation: Recommendation) -> RecommendationDTO:
    return RecommendationDTO.model_validate(recommendation)
