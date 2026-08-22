"""Counselor escalation DTOs (FR-15)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import Field, field_validator

from app.schemas.common import ORMModel, StrictModel
from app.schemas.enums import EscalationStatus, EscalationTrigger


class EscalationCreateRequest(StrictModel):
    trigger_reason: EscalationTrigger
    student_note: str | None = Field(
        default=None, max_length=2000, description="What the student wants help with"
    )


class EscalationDTO(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID | None
    trigger_reason: EscalationTrigger
    status: EscalationStatus
    student_summary_snapshot: dict[str, Any]
    counselor_user_id: uuid.UUID | None
    counselor_notes: str | None
    counselor_override_decision: str | None
    counselor_override_rationale: str | None
    scheduled_at: datetime | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    # True once the student account has been erased. The portal renders
    # "[Anonymized Profile / Closed Account]" rather than crashing on a null (Story 5.2).
    is_anonymized: bool = False
    urgency_rank: int = 99


class EscalationQueueResponse(StrictModel):
    total: int
    results: list[EscalationDTO]
    crisis_count: int = Field(
        description="Crisis-flagged tickets in the queue, surfaced separately at the top"
    )


class EscalationReviewRequest(StrictModel):
    status: EscalationStatus
    counselor_notes: str | None = Field(default=None, max_length=5000)
    counselor_override_decision: str | None = Field(default=None, max_length=2000)
    # Mandatory whenever an override is recorded: a human decision that changes what
    # the student was told must carry its reasoning (FR-15, PRD Section 13.5).
    counselor_override_rationale: str | None = Field(default=None, max_length=5000)
    scheduled_at: datetime | None = None

    @field_validator("counselor_override_rationale")
    @classmethod
    def _strip_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            return None
        return value


class ErasureRequest(StrictModel):
    confirm_understanding: bool = Field(
        description=(
            "Must be true. The student is told, before this is accepted, that "
            "crisis-safety records are retained in anonymized form."
        )
    )

    @field_validator("confirm_understanding")
    @classmethod
    def _must_confirm(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Erasure must be explicitly confirmed.")
        return value


class ErasureReceipt(StrictModel):
    """Proof of what was deleted and what was lawfully retained."""

    user_id: uuid.UUID
    deleted_profile: bool
    deleted_guardian_contexts: int
    deleted_roadmaps: int
    deleted_recommendation_batches: int
    deleted_chat_interactions: int
    anonymized_chat_interactions: int
    anonymized_escalations: int
    retention_note: str = Field(
        default=(
            "Crisis-safety records were kept with all identifying details removed. They "
            "can no longer be linked back to you, and are retained only as a safety "
            "audit trail."
        )
    )


class ReassessTriggerRequest(StrictModel):
    reason: str | None = Field(
        default=None, max_length=1000, description="What changed since the last cycle"
    )


class ReassessResponse(StrictModel):
    new_batch_id: uuid.UUID
    new_batch_number: int
    superseded_batch_ids: list[uuid.UUID]
    superseded_roadmap_ids: list[uuid.UUID]
    history_preserved: bool = True
    message: str
