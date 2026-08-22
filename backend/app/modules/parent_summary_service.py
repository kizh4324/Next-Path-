"""Plain-language guardian summary (FR-17, Story 4.4).

Generated once per recommendation batch and stored. Every later read returns the stored
text verbatim — a family must never see the wording shift between visits, because that
is exactly what makes a summary feel untrustworthy at the moment it matters most.

Without an API key the deterministic template below produces the summary instead. The
response flags `generated_without_ai` so the difference is disclosed rather than hidden.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import CareerLibrary
from app.models.profile import StudentProfile
from app.models.recommendation import ParentSummary, RecommendationBatch
from app.modules.llm_client import llm_client
from app.schemas.parent_summary import CostBreakdownItem, ParentSummaryResponse

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are writing a short summary for the parent or guardian of an \
Indian student, explaining what the student's career exploration produced.

You may only use the facts in the JSON provided. Do not add information, and do not \
invent any number.

Write 2 short paragraphs, at most 180 words total:
- Paragraph 1: the options the student is considering and why each appeared, in plain \
language. Name the trade-offs honestly.
- Paragraph 2: what it would realistically cost and how long it would take, plus the \
single most useful thing the family could discuss together this month.

Tone and constraints:
- Write to a parent who may not have attended college and may be anxious about cost. \
Be respectful, never condescending.
- Do not promise outcomes. Never say the student "will" get a job or succeed.
- Do not tell the family what to choose. This opens a conversation; it does not settle \
one.
- Do not describe the results as a test score, an aptitude verdict, or a prediction.
- Use ₹ and Indian number formats (lakh, crore) exactly as they appear in the data.
- Plain prose only. No headings, no bullet points, no markdown."""


def _cost_items(
    careers: dict[str, CareerLibrary], recommendations: list[Any]
) -> list[CostBreakdownItem]:
    items: list[CostBreakdownItem] = []
    for recommendation in recommendations:
        career = careers.get(recommendation.career_id)
        if career is None or not career.india_entry_routes:
            continue
        # Show the cheapest route: it is the one that decides whether a family can
        # realistically consider this path at all.
        route = min(
            career.india_entry_routes,
            key=lambda r: int(r.get("estimated_cost_inr_min", 0) or 0),
        )
        items.append(
            CostBreakdownItem(
                career_title=career.title,
                route_name=route.get("route_name", "Entry route"),
                duration_years=int(route.get("duration_years", 0) or 0),
                estimated_cost_inr_min=int(route.get("estimated_cost_inr_min", 0) or 0),
                estimated_cost_inr_max=int(route.get("estimated_cost_inr_max", 0) or 0),
                entrance_exams=list(route.get("entrance_exams", []) or []),
                low_cost_alternative_route=route.get("low_cost_alternative_route"),
            )
        )
    return items


def _discussion_points(
    profile: StudentProfile, items: list[CostBreakdownItem], recommendations: list[Any]
) -> list[str]:
    points: list[str] = []
    if items:
        cheapest = min(items, key=lambda i: i.estimated_cost_inr_min)
        points.append(
            f"The most affordable option on this list is {cheapest.career_title} via "
            f"{cheapest.route_name}, at roughly ₹{cheapest.estimated_cost_inr_min:,} to "
            f"₹{cheapest.estimated_cost_inr_max:,} in total. Is that within reach?"
        )
        with_alternative = [i for i in items if i.low_cost_alternative_route]
        if with_alternative:
            points.append(
                "Lower-cost routes exist for some of these — worth reading together "
                "before assuming a path is closed on cost."
            )
        exams = sorted({e for i in items for e in i.entrance_exams})
        if exams:
            points.append(
                f"These paths involve entrance examinations ({', '.join(exams[:4])}). "
                "When would preparation need to start?"
            )
    thin_evidence = [
        r for r in recommendations if r.evidence_quality_label in ("Preliminary", "Sparse")
    ]
    if thin_evidence:
        points.append(
            "Some of these results are based on limited information about your child. "
            "Completing the rest of their profile would make the shortlist more reliable."
        )
    if profile.budget_tier == "low_cost_only":
        points.append(
            "You indicated a tight budget. Government and aided institutions, plus the "
            "scholarships listed in the app, are where to look first."
        )
    points.append(
        "What does your child think is missing from this list? Their objection is "
        "usually the most useful thing in the conversation."
    )
    return points


def build_fallback_summary(
    profile: StudentProfile, recommendations: list[Any], items: list[CostBreakdownItem]
) -> str:
    """Deterministic summary used when no LLM is available.

    Plainer than the generated version, and completely accurate — it is assembled from
    the stored numbers rather than describing them.
    """
    titles = [r.career_title for r in recommendations[:5]]
    if not titles:
        return (
            "Your child has not completed enough of their profile for us to suggest "
            "career options yet."
        )

    listed = ", ".join(titles[:-1]) + f", and {titles[-1]}" if len(titles) > 1 else titles[0]
    top = recommendations[0]

    parts = [
        f"Your child explored careers with Next_Path and {len(titles)} options came up: "
        f"{listed}. These are options to discuss, not a prediction of what your child "
        f"will become and not a ranking of their ability. {top.career_title} appeared "
        f"first because their interests and stated strengths line up with it and it "
        f"fits the practical constraints you both described — its fit was rated "
        f"'{top.fit_label}' and its practical feasibility '{top.feasibility_label}'."
    ]

    if items:
        cheapest = min(items, key=lambda i: i.estimated_cost_inr_min)
        costliest = max(items, key=lambda i: i.estimated_cost_inr_max)
        cost_sentence = (
            f"On cost, these paths range from about ₹{cheapest.estimated_cost_inr_min:,} "
            f"({cheapest.career_title}, {cheapest.route_name}) up to around "
            f"₹{costliest.estimated_cost_inr_max:,} ({costliest.career_title}), as total "
            f"programme costs rather than annual fees."
        )
        alternative = next((i for i in items if i.low_cost_alternative_route), None)
        if alternative is not None:
            cost_sentence += (
                f" There is also a lower-cost route for {alternative.career_title}: "
                f"{alternative.low_cost_alternative_route}."
            )
        parts.append(
            cost_sentence
            + " The most useful thing you could do this month is sit down together and "
            "work out which of these is genuinely affordable for your family, and say so "
            "honestly — a plan built on an unrealistic budget helps nobody."
        )
    else:
        parts.append(
            "We do not yet have cost information recorded for these options. The "
            "institution's own website is the reliable source. The most useful thing you "
            "could do this month is discuss what your family can realistically afford, "
            "before your child becomes attached to one path."
        )

    return "\n\n".join(parts)


async def generate_or_get_summary(
    db: AsyncSession, profile: StudentProfile, regenerate: bool = False
) -> ParentSummaryResponse:
    result = await db.execute(
        select(RecommendationBatch)
        .where(
            RecommendationBatch.student_id == profile.id,
            RecommendationBatch.is_current.is_(True),
        )
        .options(selectinload(RecommendationBatch.recommendations))
        .order_by(RecommendationBatch.batch_number.desc())
    )
    batch = result.scalars().first()
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current recommendations to summarize.",
        )

    recommendations = sorted(batch.recommendations, key=lambda r: r.rank_position)
    careers = {
        c.id: c
        for c in (
            await db.execute(
                select(CareerLibrary).where(
                    CareerLibrary.id.in_([r.career_id for r in recommendations])
                )
            )
        )
        .scalars()
        .all()
    }
    items = _cost_items(careers, recommendations)
    priorities = sorted(
        {p for context in profile.guardian_contexts for p in (context.guardian_priorities or [])}
    )

    existing = (
        await db.execute(
            select(ParentSummary)
            .where(ParentSummary.recommendation_batch_id == batch.id)
            .order_by(ParentSummary.generated_at.desc())
        )
    ).scalars().first()

    # Read the stored text back verbatim — no regeneration, no drift.
    if existing is not None and not regenerate:
        return ParentSummaryResponse(
            id=existing.id,
            student_id=profile.id,
            recommendation_batch_id=batch.id,
            summary_text=existing.summary_text,
            generated_at=existing.generated_at,
            cost_breakdown=items,
            discussion_points=_discussion_points(profile, items, recommendations),
            guardian_priorities_reflected=priorities,
        )

    payload: dict[str, Any] = {
        "student_stage": profile.education_stage,
        "budget_tier": profile.budget_tier,
        "relocation_willingness": profile.relocation_willingness,
        "guardian_priorities": priorities,
        "guardian_financial_ceiling_inr": next(
            (
                c.financial_ceiling_inr
                for c in profile.guardian_contexts
                if c.financial_ceiling_inr is not None
            ),
            None,
        ),
        "options": [
            {
                "career": r.career_title,
                "rank": r.rank_position,
                "fit": r.fit_label,
                "practical_feasibility": r.feasibility_label,
                "evidence_quality": r.evidence_quality_label,
                "why_it_appeared": r.reasons[:4],
                "concerns": r.concerns[:4],
                "what_we_still_do_not_know": r.missing_evidence_flags[:3],
            }
            for r in recommendations
        ],
        "costs": [item.model_dump() for item in items],
    }

    llm = await llm_client.generate_message(
        system_prompt=SYSTEM_PROMPT,
        user_content=json.dumps(payload, ensure_ascii=False, indent=1),
    )
    summary_text = (
        llm.text if llm.ok else build_fallback_summary(profile, recommendations, items)
    )
    if not llm.ok:
        logger.info(
            "Parent summary for batch %s used the deterministic template (%s).",
            batch.id,
            llm.error_kind,
        )

    record = ParentSummary(
        student_id=profile.id,
        recommendation_batch_id=batch.id,
        summary_text=summary_text,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return ParentSummaryResponse(
        id=record.id,
        student_id=profile.id,
        recommendation_batch_id=batch.id,
        summary_text=record.summary_text,
        generated_at=record.generated_at,
        cost_breakdown=items,
        discussion_points=_discussion_points(profile, items, recommendations),
        guardian_priorities_reflected=priorities,
        generated_without_ai=not llm.ok,
    )
