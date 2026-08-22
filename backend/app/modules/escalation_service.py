"""Counselor escalation, reassessment, and right-to-erasure (FR-15, FR-18, FR-20).

Two rules run through all of this:

* A snapshot is frozen at trigger time. A counselor must review what the student
  actually saw, not a profile that has since moved underneath them.
* Crisis-safety records survive erasure in anonymized form. PRD Section 14 requires a
  duty-of-care audit trail; DPDP requires the identity to go. Both are satisfied by
  nulling `student_id` and scrubbing the snapshot rather than deleting the row.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatInteraction
from app.models.escalation import TRIGGER_URGENCY, CounselorEscalation
from app.models.profile import GuardianContext, StudentProfile
from app.models.recommendation import ParentSummary, Recommendation, RecommendationBatch
from app.models.roadmap import Roadmap
from app.models.user import User
from app.schemas.enums import EscalationStatus, EscalationTrigger
from app.schemas.escalation import (
    ErasureReceipt,
    EscalationDTO,
    EscalationQueueResponse,
    EscalationReviewRequest,
)

logger = logging.getLogger(__name__)

# Evidence quality at or below this is thin enough that a human should look before the
# student acts on the result (PRD Section 14).
LOW_EVIDENCE_THRESHOLD = 40.0

ANONYMIZED_LABEL = "[Anonymized Profile / Closed Account]"

# Snapshot keys that carry identity. Removed on erasure; the rest of the snapshot —
# the decision context a safety review actually needs — is retained.
PII_SNAPSHOT_KEYS = frozenset(
    {"full_name", "email", "phone_number", "guardian_name", "guardian_email",
     "guardian_phone", "user_id", "student_id", "grade_or_year"}
)


def build_snapshot(
    profile: StudentProfile,
    user: User | None,
    recommendations: list[Recommendation] | None = None,
    note: str | None = None,
) -> dict[str, Any]:
    """Freeze the decision context a counselor needs to review this case."""
    snapshot: dict[str, Any] = {
        "captured_at": datetime.now(UTC).isoformat(),
        "student_id": str(profile.id),
        "full_name": user.full_name if user else None,
        "email": user.email if user else None,
        "education_stage": profile.education_stage,
        "grade_or_year": profile.grade_or_year,
        "current_stream": profile.current_stream,
        "interests": profile.interests,
        "aptitude_signals": profile.aptitude_signals,
        "budget_tier": profile.budget_tier,
        "relocation_willingness": profile.relocation_willingness,
        "profile_completeness_pct": profile.profile_completeness_pct,
        "academic_records_available": profile.academic_records_available,
        "consent_type": profile.consent_type,
        "guardian_contexts": [
            {
                "guardian_name": c.guardian_name,
                "relationship": c.relationship_to_student,
                "priorities": c.guardian_priorities,
                "financial_ceiling_inr": c.financial_ceiling_inr,
                "relocation_restriction": c.relocation_restriction,
                "notes": c.notes_and_concerns,
            }
            for c in profile.guardian_contexts
        ],
        "student_note": note,
    }
    if recommendations:
        snapshot["recommendations"] = [
            {
                "rank": r.rank_position,
                "career": r.career_title,
                "composite": float(r.composite_score),
                "fit": r.fit_label,
                "feasibility": r.feasibility_label,
                "evidence_quality": r.evidence_quality_label,
                "reasons": r.reasons,
                "concerns": r.concerns,
                "missing_evidence": r.missing_evidence_flags,
            }
            for r in sorted(recommendations, key=lambda r: r.rank_position)
        ]
    return snapshot


def evaluate_auto_triggers(
    profile: StudentProfile, recommendations: list[Recommendation]
) -> list[EscalationTrigger]:
    """Decide whether this student's situation warrants a human, automatically.

    These are the cases where an algorithm should hand over rather than push on
    (PRD Section 14).
    """
    triggers: list[EscalationTrigger] = []

    if recommendations:
        top = min(recommendations, key=lambda r: r.rank_position)
        if float(top.evidence_quality_score) <= LOW_EVIDENCE_THRESHOLD:
            triggers.append(EscalationTrigger.LOW_EVIDENCE_PROFILE)
        # Every option being hard to reach is a constraint problem, not a fit problem,
        # and no amount of re-scoring will fix it.
        if all(r.feasibility_label in ("Challenging", "Low") for r in recommendations):
            triggers.append(EscalationTrigger.SEVERE_CONSTRAINT_CONFLICT)

    # Student and guardian have set incompatible limits on how far the student may go.
    from app.schemas.enums import RELOCATION_ORDER, RelocationWillingness

    try:
        student_rank = RELOCATION_ORDER[RelocationWillingness(profile.relocation_willingness)]
    except ValueError:
        student_rank = 0
    for context in profile.guardian_contexts:
        try:
            guardian_rank = RELOCATION_ORDER[
                RelocationWillingness(context.relocation_restriction)
            ]
        except ValueError:
            continue
        if guardian_rank < student_rank:
            triggers.append(EscalationTrigger.STUDENT_PARENT_DEADLOCK)
            break

    # A minor at a stream/degree decision point is a high-stakes, hard-to-reverse choice.
    if profile.education_stage in ("class_8_10", "class_11_12") and recommendations:
        top = min(recommendations, key=lambda r: r.rank_position)
        if top.fit_label in ("Emerging", "Insufficient evidence"):
            triggers.append(EscalationTrigger.HIGH_STAKES_CHOICE)

    # Preserve order, drop duplicates.
    return list(dict.fromkeys(triggers))


async def create_escalation(
    db: AsyncSession,
    profile: StudentProfile,
    trigger_reason: EscalationTrigger,
    user: User | None = None,
    note: str | None = None,
    commit: bool = True,
) -> CounselorEscalation:
    recommendations = (
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

    escalation = CounselorEscalation(
        student_id=profile.id,
        trigger_reason=trigger_reason.value,
        status=EscalationStatus.PENDING.value,
        student_summary_snapshot=build_snapshot(profile, user, list(recommendations), note),
    )
    db.add(escalation)
    if commit:
        await db.commit()
        await db.refresh(escalation)
    else:
        await db.flush()
    logger.info(
        "Escalation %s raised for student %s (%s)",
        escalation.id,
        profile.id,
        trigger_reason.value,
    )
    return escalation


async def raise_crisis_escalation(
    db: AsyncSession, profile: StudentProfile | None, user: User | None, question: str
) -> CounselorEscalation | None:
    """Auto-raise the highest-priority ticket after a crisis interception (Story 4.3)."""
    if profile is None:
        return None
    return await create_escalation(
        db,
        profile,
        EscalationTrigger.CRISIS_SAFETY_FLAG,
        user=user,
        note=(
            "Automatically raised: the student's message contained language indicating "
            "possible self-harm risk. Crisis helplines were shown immediately."
        ),
    )


def to_dto(escalation: CounselorEscalation) -> EscalationDTO:
    dto = EscalationDTO.model_validate(escalation)
    dto.is_anonymized = escalation.student_id is None
    dto.urgency_rank = TRIGGER_URGENCY.get(escalation.trigger_reason, 99)
    if dto.is_anonymized:
        # The portal must render this without crashing on a null student (Story 5.2).
        dto.student_summary_snapshot = {
            **dto.student_summary_snapshot,
            "display_name": ANONYMIZED_LABEL,
        }
    return dto


async def get_queue(
    db: AsyncSession, status_filter: EscalationStatus | None = None, limit: int = 100
) -> EscalationQueueResponse:
    """Pending tickets, crisis flags first (Story 5.1)."""
    statement = select(CounselorEscalation)
    if status_filter is not None:
        statement = statement.where(CounselorEscalation.status == status_filter.value)
    rows = (await db.execute(statement.limit(limit))).scalars().all()

    # Urgency is a property of the trigger, so ordering happens in Python rather than
    # duplicating the priority table as a SQL CASE expression.
    ordered = sorted(
        rows,
        key=lambda e: (TRIGGER_URGENCY.get(e.trigger_reason, 99), e.created_at),
    )
    dtos = [to_dto(e) for e in ordered]
    return EscalationQueueResponse(
        total=len(dtos),
        results=dtos,
        crisis_count=sum(1 for e in ordered if e.trigger_reason == "crisis_safety_flag"),
    )


async def review_escalation(
    db: AsyncSession,
    escalation_id: object,
    counselor: User,
    payload: EscalationReviewRequest,
) -> EscalationDTO:
    escalation = await db.get(CounselorEscalation, escalation_id)
    if escalation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation not found.")

    # An override changes what a student was told. It must carry its reasoning, or the
    # audit trail records a decision nobody can account for (FR-15, PRD Section 13.5).
    if payload.counselor_override_decision and not payload.counselor_override_rationale:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="counselor_override_rationale is required when recording an override.",
        )

    escalation.counselor_user_id = counselor.id
    escalation.status = payload.status.value
    if payload.counselor_notes is not None:
        escalation.counselor_notes = payload.counselor_notes
    if payload.counselor_override_decision is not None:
        escalation.counselor_override_decision = payload.counselor_override_decision
        escalation.counselor_override_rationale = payload.counselor_override_rationale
    if payload.scheduled_at is not None:
        escalation.scheduled_at = payload.scheduled_at
    if payload.status in (EscalationStatus.RESOLVED, EscalationStatus.OVERRIDDEN):
        escalation.resolved_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(escalation)
    return to_dto(escalation)


def _scrub_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Strip identity from a retained snapshot, keep the decision context."""
    scrubbed = {k: v for k, v in snapshot.items() if k not in PII_SNAPSHOT_KEYS}
    for context in scrubbed.get("guardian_contexts", []) or []:
        if isinstance(context, dict):
            context.pop("guardian_name", None)
            context.pop("notes", None)
    scrubbed["anonymized"] = True
    scrubbed["anonymized_at"] = datetime.now(UTC).isoformat()
    scrubbed["display_name"] = ANONYMIZED_LABEL
    return scrubbed


async def erase_student_data(db: AsyncSession, user: User) -> ErasureReceipt:
    """Right to erasure with a safety-audit retention exception (FR-20, Story 5.4).

    Deleted outright: profile, guardian context, roadmaps, recommendation history, and
    ordinary chat logs. Retained anonymized: crisis-flagged escalations and escalated
    chat interactions.
    """
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.user_id == user.id)
        .options(selectinload(StudentProfile.guardian_contexts))
    )
    profile = result.scalar_one_or_none()

    if profile is None:
        user.is_active = False
        await db.commit()
        return ErasureReceipt(
            user_id=user.id,
            deleted_profile=False,
            deleted_guardian_contexts=0,
            deleted_roadmaps=0,
            deleted_recommendation_batches=0,
            deleted_chat_interactions=0,
            anonymized_chat_interactions=0,
            anonymized_escalations=0,
        )

    student_id = profile.id

    # --- Anonymize what must survive, BEFORE the cascade removes the link ---
    crisis_escalations = (
        (
            await db.execute(
                select(CounselorEscalation).where(
                    CounselorEscalation.student_id == student_id,
                    CounselorEscalation.trigger_reason == "crisis_safety_flag",
                )
            )
        )
        .scalars()
        .all()
    )
    for escalation in crisis_escalations:
        escalation.student_summary_snapshot = _scrub_snapshot(
            dict(escalation.student_summary_snapshot)
        )
        escalation.student_id = None
        escalation.counselor_notes = None

    escalated_chats = (
        await db.execute(
            update(ChatInteraction)
            .where(
                ChatInteraction.student_id == student_id,
                ChatInteraction.was_escalated.is_(True),
            )
            .values(student_id=None)
        )
    ).rowcount or 0

    # Non-crisis escalations carry no retention duty and are removed.
    await db.execute(
        delete(CounselorEscalation).where(
            CounselorEscalation.student_id == student_id,
            CounselorEscalation.trigger_reason != "crisis_safety_flag",
        )
    )

    # --- Delete the rest ---
    deleted_chats = (
        await db.execute(
            delete(ChatInteraction).where(
                ChatInteraction.student_id == student_id,
                ChatInteraction.was_escalated.is_(False),
            )
        )
    ).rowcount or 0

    guardian_count = len(profile.guardian_contexts)
    roadmap_count = len(
        (
            await db.execute(select(Roadmap.id).where(Roadmap.student_id == student_id))
        )
        .scalars()
        .all()
    )
    batch_count = len(
        (
            await db.execute(
                select(RecommendationBatch.id).where(
                    RecommendationBatch.student_id == student_id
                )
            )
        )
        .scalars()
        .all()
    )

    await db.execute(delete(ParentSummary).where(ParentSummary.student_id == student_id))
    await db.execute(delete(Roadmap).where(Roadmap.student_id == student_id))
    await db.execute(
        delete(RecommendationBatch).where(RecommendationBatch.student_id == student_id)
    )
    await db.execute(delete(GuardianContext).where(GuardianContext.student_id == student_id))
    await db.execute(delete(StudentProfile).where(StudentProfile.id == student_id))

    # The account is deactivated and stripped rather than row-deleted, so any retained
    # counselor record still references a valid (empty) user row.
    user.is_active = False
    user.full_name = ANONYMIZED_LABEL
    user.email = f"erased-{user.id}@invalid.local"
    user.phone_number = None
    user.hashed_password = "!"

    await db.commit()
    logger.info("Erased data for user %s; %d crisis records retained anonymized.",
                user.id, len(crisis_escalations))

    return ErasureReceipt(
        user_id=user.id,
        deleted_profile=True,
        deleted_guardian_contexts=guardian_count,
        deleted_roadmaps=roadmap_count,
        deleted_recommendation_batches=batch_count,
        deleted_chat_interactions=deleted_chats,
        anonymized_chat_interactions=escalated_chats,
        anonymized_escalations=len(crisis_escalations),
    )
