"""Counselor triage, escalation, and data-rights endpoints (FR-15, FR-20)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query, status

from app.core.dependencies import CounselorUser, CurrentStudent, CurrentUser, DbSession
from app.modules import escalation_service
from app.schemas.enums import EscalationStatus
from app.schemas.escalation import (
    ErasureReceipt,
    ErasureRequest,
    EscalationCreateRequest,
    EscalationDTO,
    EscalationQueueResponse,
    EscalationReviewRequest,
)

router = APIRouter(tags=["Counselor & Governance"])


@router.post(
    "/escalations/trigger",
    response_model=EscalationDTO,
    status_code=status.HTTP_201_CREATED,
)
async def trigger_escalation(
    payload: EscalationCreateRequest,
    profile: CurrentStudent,
    current_user: CurrentUser,
    db: DbSession,
) -> EscalationDTO:
    """Request a human counselor. The profile is frozen into the ticket at this moment."""
    escalation = await escalation_service.create_escalation(
        db, profile, payload.trigger_reason, user=current_user, note=payload.student_note
    )
    return escalation_service.to_dto(escalation)


@router.get("/counselor/queue", response_model=EscalationQueueResponse)
async def queue(
    counselor: CounselorUser,
    db: DbSession,
    status_filter: EscalationStatus | None = Query(default=None, alias="status"),
) -> EscalationQueueResponse:
    """Triage queue ordered by urgency — crisis flags always first."""
    return await escalation_service.get_queue(db, status_filter)


@router.post("/counselor/review/{escalation_id}", response_model=EscalationDTO)
async def review(
    escalation_id: uuid.UUID,
    payload: EscalationReviewRequest,
    counselor: CounselorUser,
    db: DbSession,
) -> EscalationDTO:
    """Record notes and, optionally, an override. An override requires a rationale."""
    return await escalation_service.review_escalation(db, escalation_id, counselor, payload)


@router.delete("/account", response_model=ErasureReceipt)
async def erase_account(
    payload: ErasureRequest, current_user: CurrentUser, db: DbSession
) -> ErasureReceipt:
    """Delete personal data (FR-20).

    Crisis-safety records are retained with all identifying details removed, as a
    duty-of-care audit trail. The receipt states exactly what was deleted and what was
    kept.
    """
    return await escalation_service.erase_student_data(db, current_user)
