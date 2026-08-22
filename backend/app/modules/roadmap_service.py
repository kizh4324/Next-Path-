"""Adaptive roadmap and milestone generation (FR-09, FR-10, FR-11, FR-12).

Deterministic and stage-aware. A Class 8-10 student gets exploration and stream
groundwork; a Class 11-12 student gets entrance-exam and application milestones; an
early-college student gets skill-building and portfolio milestones.

Every generated milestone carries a `fallback_action`. That is not decoration — PRD
Section 11 requires the plan to degrade gracefully, so a student who misses a step has
a stated next move rather than a dead end.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import CareerLibrary, CareerSkill
from app.models.profile import StudentProfile
from app.models.roadmap import Roadmap, RoadmapMilestone
from app.schemas.enums import (
    EducationStage,
    EvidenceType,
    MilestoneType,
    SkillCategory,
    TimeframeBucket,
)
from app.schemas.roadmap import (
    MilestoneCompleteRequest,
    MilestoneDTO,
    RoadmapResponse,
    SkillGapItem,
    SkillGapResponse,
)

logger = logging.getLogger(__name__)

# A milestone is "free or low cost" at or below this total. Above it, the roadmap says
# so explicitly and offers the free fallback (FR-12).
LOW_COST_CEILING_INR = 500


def _cheapest_route(career: CareerLibrary) -> dict[str, Any] | None:
    routes = list(career.india_entry_routes or [])
    if not routes:
        return None
    return min(routes, key=lambda r: int(r.get("estimated_cost_inr_min", 0) or 0))


def _entrance_exams(career: CareerLibrary) -> list[str]:
    exams: list[str] = []
    for route in career.india_entry_routes or []:
        for exam in route.get("entrance_exams", []) or []:
            if exam not in exams:
                exams.append(exam)
    return exams


def _skill_by_category(skills: list[CareerSkill], category: str) -> list[CareerSkill]:
    return [s for s in skills if s.category == category]


def _held_skills(profile: StudentProfile) -> set[str]:
    """Domains the student already claims strength in (self-rating of 4 or 5)."""
    return {
        key.lower()
        for key, rating in (profile.aptitude_signals or {}).items()
        if isinstance(rating, int) and rating >= 4
    }


def _is_probably_held(skill: CareerSkill, held: set[str]) -> bool:
    name = skill.skill_name.lower()
    return any(domain in name or name in domain for domain in held)


def generate_milestones(
    profile: StudentProfile,
    primary: CareerLibrary,
    backup: CareerLibrary | None,
) -> list[dict[str, Any]]:
    """Build the 7-day / 30-day / 90-day / 180-day plan for this student and career."""
    stage = profile.education_stage
    essential = _skill_by_category(list(primary.skills), SkillCategory.ESSENTIAL.value)
    useful = _skill_by_category(list(primary.skills), SkillCategory.USEFUL.value)
    route = _cheapest_route(primary)
    exams = _entrance_exams(primary)
    milestones: list[dict[str, Any]] = []

    def add(
        bucket: TimeframeBucket,
        title: str,
        description: str,
        milestone_type: MilestoneType,
        fallback_action: str,
        cost: int = 0,
        free_url: str | None = None,
        evidence: EvidenceType = EvidenceType.SELF_REPORT,
        prerequisites: list[str] | None = None,
    ) -> None:
        milestones.append(
            {
                "timeframe_bucket": bucket.value,
                "order_index": len(milestones),
                "title": title,
                "description": description,
                "milestone_type": milestone_type.value,
                "prerequisites": prerequisites or [],
                "estimated_cost_inr": cost,
                "is_low_cost_or_free": cost <= LOW_COST_CEILING_INR,
                "free_resource_url": free_url,
                "completion_evidence_type": evidence.value,
                "fallback_action": fallback_action,
            }
        )

    # ---- next 7 days: understand the reality, cheaply and immediately ---------
    add(
        TimeframeBucket.NEXT_7_DAYS,
        f"Read what a {primary.title} actually does all day",
        (
            f"{primary.work_reality_summary} Read this and decide honestly whether the "
            "day-to-day appeals to you — not just the job title."
        ),
        MilestoneType.EXPLORATION,
        fallback_action=(
            "If the daily reality does not appeal, that is useful information, not a "
            "failure. Open your comparison view and look at your backup option instead."
        ),
    )
    add(
        TimeframeBucket.NEXT_7_DAYS,
        "Talk to one person who does this work",
        (
            "Find someone in this field — a relative, a teacher's contact, an alumnus, "
            "or someone on a professional network — and ask what they wish they had "
            "known before starting. One honest conversation beats ten articles."
        ),
        MilestoneType.EXPLORATION,
        fallback_action=(
            "If you cannot reach anyone, ask the in-app assistant what this role "
            "involves, or request a counselor conversation from your dashboard."
        ),
    )
    add(
        TimeframeBucket.NEXT_7_DAYS,
        "Show this plan to a parent or guardian",
        (
            "Open the guardian summary and go through the costs and routes together. "
            "Disagreements are much cheaper to resolve now than after fees are paid."
        ),
        MilestoneType.EXPLORATION,
        fallback_action=(
            "If the conversation stalls or turns into a disagreement, you can request a "
            "counselor session — that is exactly what it is there for."
        ),
    )

    # ---- 30 days: first real, low-cost step ----------------------------------
    if stage == EducationStage.CLASS_8_10.value:
        required = ", ".join(primary.prerequisites) or "the general stream"
        add(
            TimeframeBucket.DAY_30,
            "Work out which stream this path needs",
            (
                f"This career normally expects {required}. Find out which subjects your "
                "school actually offers and what marks they ask for. Write the answer "
                "down — a stream choice made on rumour is the most expensive mistake at "
                "your stage."
            ),
            MilestoneType.FOUNDATIONAL_LEARNING,
            fallback_action=(
                "If your school does not offer the subjects, look at nearby government "
                "schools and junior colleges before assuming the path is closed."
            ),
        )
    if essential:
        first = essential[0]
        add(
            TimeframeBucket.DAY_30,
            f"Start on {first.skill_name}",
            (
                f"{first.description} Begin with {first.free_learning_resource_name}. "
                "Aim for consistent short sessions rather than one long burst."
            ),
            MilestoneType.FOUNDATIONAL_LEARNING,
            free_url=first.free_learning_resource_url,
            fallback_action=(
                "If this is harder than expected, that is normal and not a signal to "
                "quit. Drop to a slower pace before dropping the goal."
            ),
        )
    if len(essential) > 1:
        second = essential[1]
        add(
            TimeframeBucket.DAY_30,
            f"Produce something small using {second.skill_name}",
            (
                f"{second.description} Make one small, finished thing you can show "
                "someone — finished beats ambitious at this stage."
            ),
            MilestoneType.PROJECT_OUTPUT,
            free_url=second.free_learning_resource_url,
            evidence=EvidenceType.PROJECT_ARTIFACT,
            fallback_action=(
                "If you cannot finish it, submit what you have and note where you got "
                "stuck. A stuck point is a better conversation with a mentor than silence."
            ),
        )

    # ---- 90 days: exams, deeper skills, funding ------------------------------
    if exams and stage in (EducationStage.CLASS_11_12.value, EducationStage.CLASS_8_10.value):
        add(
            TimeframeBucket.DAY_90,
            f"Build a study plan for {exams[0]}",
            (
                f"The main entrance route here is {', '.join(exams[:3])}. Download the "
                "official syllabus and last three years' papers from the conducting "
                "body's own site — free — and plan backwards from the exam date. "
                "Paid coaching is optional, not required."
            ),
            MilestoneType.EXAM_PREP,
            free_url="https://ncert.nic.in/textbook.php",
            fallback_action=(
                "If the syllabus looks unmanageable in the time you have, sit the exam "
                "as a trial run this year and plan properly for next. Do not abandon the "
                "path over one calendar."
            ),
            prerequisites=[f"Start on {essential[0].skill_name}"] if essential else [],
        )
    add(
        TimeframeBucket.DAY_90,
        "Check what financial help you can get",
        (
            "Open the scholarships view and filter by your state, category, and "
            "qualification. Applications usually need an income certificate and a "
            "domicile certificate, and those take weeks to obtain — start that now, "
            "not when the deadline is near."
        ),
        MilestoneType.SCHOLARSHIP_APPLICATION,
        free_url="https://scholarships.gov.in/",
        fallback_action=(
            "If nothing matches you, check scholarships.gov.in directly — our catalogue "
            "covers a limited set of states and is not the full national list."
        ),
    )
    if useful:
        pick = useful[0]
        add(
            TimeframeBucket.DAY_90,
            f"Add {pick.skill_name} to what you can do",
            f"{pick.description} Use {pick.free_learning_resource_name} to get started.",
            MilestoneType.SKILL_CHECK,
            free_url=pick.free_learning_resource_url,
            evidence=EvidenceType.QUIZ_SCORE,
            fallback_action=(
                "This one is useful rather than essential. If time is short, skip it and "
                "return after your essential skills are solid."
            ),
        )

    # ---- 180 days: commit, apply, and re-check honestly ----------------------
    if route is not None:
        cost_min = int(route.get("estimated_cost_inr_min", 0) or 0)
        cost_max = int(route.get("estimated_cost_inr_max", 0) or 0)
        alternative = route.get("low_cost_alternative_route")
        add(
            TimeframeBucket.DAY_180,
            f"Shortlist institutions for: {route.get('route_name', 'your entry route')}",
            (
                f"This route costs roughly ₹{cost_min:,}-₹{cost_max:,} in total and takes "
                f"about {route.get('duration_years', '?')} years. List five specific "
                "institutions with their actual fees, cut-offs, and application dates. "
                + (f"Lower-cost option worth listing too: {alternative}" if alternative else "")
            ),
            MilestoneType.EXPLORATION,
            fallback_action=(
                "If every option is beyond your budget, look at the low-cost alternative "
                "route for this career and at your backup pathway before ruling anything out."
            ),
        )
    add(
        TimeframeBucket.DAY_180,
        "Produce one piece of work you would show an employer or interviewer",
        (
            "Something finished and specific to this field. It does not need to be "
            "impressive — it needs to be real, and to be yours."
        ),
        MilestoneType.PROJECT_OUTPUT,
        evidence=EvidenceType.PROJECT_ARTIFACT,
        fallback_action=(
            "If you have not finished one, submit your best partial attempt. Partial "
            "evidence still tells a counselor far more than none."
        ),
    )
    if backup is not None:
        add(
            TimeframeBucket.DAY_180,
            f"Keep your backup option ({backup.title}) genuinely open",
            (
                f"Spend a few hours checking what {backup.title} would require from here. "
                "A backup only works if you have actually looked at it — otherwise it is "
                "a comforting idea rather than a plan."
            ),
            MilestoneType.EXPLORATION,
            fallback_action=(
                "If the backup no longer appeals, run a reassessment and pick a different "
                "one. An unrealistic backup is worse than none."
            ),
        )
    add(
        TimeframeBucket.DAY_180,
        "Reassess honestly",
        (
            "Six months in, redo your profile. Interests shift, marks change, family "
            "circumstances change. Your previous plan is kept in full history — nothing "
            "you have done is lost by re-checking."
        ),
        MilestoneType.REASSESSMENT,
        fallback_action=(
            "If your circumstances have changed sharply, reassess immediately rather than "
            "waiting for this date."
        ),
    )

    return milestones


async def create_roadmap(
    db: AsyncSession,
    profile: StudentProfile,
    primary_career_id: str,
    backup_career_id: str | None,
) -> Roadmap:
    primary = await _career_or_404(db, primary_career_id)
    backup = await _career_or_404(db, backup_career_id) if backup_career_id else None

    roadmap = Roadmap(
        student_id=profile.id,
        primary_career_id=primary.id,
        backup_career_id=backup.id if backup else None,
        status="active",
        is_current=True,
    )
    db.add(roadmap)
    await db.flush()

    for milestone in generate_milestones(profile, primary, backup):
        db.add(RoadmapMilestone(roadmap_id=roadmap.id, **milestone))

    await db.flush()
    logger.info("Created roadmap %s for student %s", roadmap.id, profile.id)
    return roadmap


async def _career_or_404(db: AsyncSession, career_id: str) -> CareerLibrary:
    result = await db.execute(
        select(CareerLibrary)
        .where(CareerLibrary.id == career_id)
        .options(selectinload(CareerLibrary.skills))
    )
    career = result.scalar_one_or_none()
    if career is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Career '{career_id}' not found."
        )
    return career


async def get_current_roadmap(db: AsyncSession, student_id: object) -> RoadmapResponse:
    result = await db.execute(
        select(Roadmap)
        .where(Roadmap.student_id == student_id, Roadmap.is_current.is_(True))
        .options(
            selectinload(Roadmap.milestones),
            selectinload(Roadmap.primary_career),
            selectinload(Roadmap.backup_career),
        )
        .order_by(Roadmap.created_at.desc())
    )
    roadmap = result.scalars().first()
    if roadmap is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active roadmap. Select a primary pathway first.",
        )
    return build_roadmap_response(roadmap)


def build_roadmap_response(roadmap: Roadmap) -> RoadmapResponse:
    completed_titles = {m.title for m in roadmap.milestones if m.is_completed}
    bucket_order = {b.value: i for i, b in enumerate(TimeframeBucket)}
    milestones = sorted(
        roadmap.milestones,
        key=lambda m: (bucket_order.get(m.timeframe_bucket, 9), m.order_index),
    )

    dtos: list[MilestoneDTO] = []
    for milestone in milestones:
        dto = MilestoneDTO.model_validate(milestone)
        blocked = [p for p in (milestone.prerequisites or []) if p not in completed_titles]
        dto.blocked_by = blocked
        # A completed milestone never shows as locked, even if a prerequisite was
        # completed out of order — the student already did the thing.
        dto.is_locked = bool(blocked) and not milestone.is_completed
        dtos.append(dto)

    response = RoadmapResponse.model_validate(
        {
            "id": roadmap.id,
            "student_id": roadmap.student_id,
            "primary_career_id": roadmap.primary_career_id,
            "primary_career_title": roadmap.primary_career.title,
            "backup_career_id": roadmap.backup_career_id,
            "backup_career_title": roadmap.backup_career.title if roadmap.backup_career else None,
            "status": roadmap.status,
            "is_current": roadmap.is_current,
            "superseded_at": roadmap.superseded_at,
            "created_at": roadmap.created_at,
            "milestones": [d.model_dump() for d in dtos],
        }
    )
    response.total_milestones = len(dtos)
    response.completed_milestones = sum(1 for d in dtos if d.is_completed)
    response.total_estimated_cost_inr = sum(d.estimated_cost_inr for d in dtos)
    response.free_milestone_count = sum(1 for d in dtos if d.is_low_cost_or_free)
    return response


async def complete_milestone(
    db: AsyncSession,
    student_id: object,
    milestone_id: object,
    payload: MilestoneCompleteRequest,
) -> MilestoneDTO:
    milestone = await db.get(RoadmapMilestone, milestone_id)
    if milestone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")

    roadmap = await db.get(Roadmap, milestone.roadmap_id)
    if roadmap is None or roadmap.student_id != student_id:
        # 404 rather than 403: confirming a milestone exists but belongs to someone else
        # is itself a small leak.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")

    milestone.is_completed = True
    milestone.completed_at = datetime.now(UTC)
    milestone.completion_evidence_type = payload.completion_evidence_type.value
    milestone.completion_evidence_note_or_url = payload.completion_evidence_note_or_url

    await db.commit()
    await db.refresh(milestone)
    return MilestoneDTO.model_validate(milestone)


async def get_skill_gaps(
    db: AsyncSession, profile: StudentProfile, career_id: str
) -> SkillGapResponse:
    """Categorised skill gaps with a free route attached to each (FR-11, FR-12)."""
    career = await _career_or_404(db, career_id)
    held = _held_skills(profile)

    def to_item(skill: CareerSkill) -> SkillGapItem:
        return SkillGapItem(
            skill_name=skill.skill_name,
            category=SkillCategory(skill.category),
            description=skill.description,
            is_already_held=_is_probably_held(skill, held),
            free_learning_resource_name=skill.free_learning_resource_name,
            free_learning_resource_url=skill.free_learning_resource_url,
            commercial_disclosure=skill.commercial_disclosure,
        )

    buckets: dict[str, list[SkillGapItem]] = {"essential": [], "useful": [], "optional": []}
    for skill in sorted(career.skills, key=lambda s: s.skill_name):
        buckets[skill.category].append(to_item(skill))

    return SkillGapResponse(
        career_id=career.id,
        career_title=career.title,
        essential=buckets["essential"],
        useful=buckets["useful"],
        optional=buckets["optional"],
        gap_count_essential=sum(1 for s in buckets["essential"] if not s.is_already_held),
    )
