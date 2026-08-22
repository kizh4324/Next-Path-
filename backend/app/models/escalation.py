"""Table 14: counselor_escalations — human-in-the-loop triage (FR-15, PRD Section 14).

Safety retention exception: `crisis_safety_flag` rows survive account erasure with
`student_id` set to NULL and PII scrubbed from the snapshot, so a duty-of-care record
remains without retaining the child's identity.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.types import (
    JSONColumn,
    TimestampTZ,
    UUIDColumn,
    created_at_column,
    updated_at_column,
)

TRIGGER_REASONS = (
    "high_stakes_choice",
    "severe_constraint_conflict",
    "student_parent_deadlock",
    "low_evidence_profile",
    "student_requested",
    "crisis_safety_flag",
)
ESCALATION_STATUSES = ("pending", "under_review", "session_scheduled", "resolved", "overridden")

# Queue ordering: a crisis flag outranks everything else regardless of age (Story 5.1).
TRIGGER_URGENCY: dict[str, int] = {
    "crisis_safety_flag": 0,
    "student_parent_deadlock": 1,
    "severe_constraint_conflict": 2,
    "high_stakes_choice": 3,
    "low_evidence_profile": 4,
    "student_requested": 5,
}


class CounselorEscalation(Base):
    __tablename__ = "counselor_escalations"
    __table_args__ = (
        CheckConstraint(
            "trigger_reason IN ('high_stakes_choice', 'severe_constraint_conflict', "
            "'student_parent_deadlock', 'low_evidence_profile', 'student_requested', "
            "'crisis_safety_flag')",
            name="ck_escalations_trigger",
        ),
        CheckConstraint(
            "status IN ('pending', 'under_review', 'session_scheduled', 'resolved', "
            "'overridden')",
            name="ck_escalations_status",
        ),
        Index("idx_escalations_student", "student_id"),
        Index("idx_escalations_status", "status"),
        Index("idx_escalations_trigger", "trigger_reason"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDColumn,
        ForeignKey("student_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    trigger_reason: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    # Frozen at trigger time so the counselor reviews what the student actually saw,
    # not a profile that has since changed underneath them.
    student_summary_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONColumn, nullable=False)

    counselor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDColumn, ForeignKey("users.id"), nullable=True
    )
    counselor_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    counselor_override_decision: Mapped[str | None] = mapped_column(Text, nullable=True)
    counselor_override_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)

    scheduled_at: Mapped[datetime | None] = mapped_column(TimestampTZ, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(TimestampTZ, nullable=True)
    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    @property
    def urgency_rank(self) -> int:
        return TRIGGER_URGENCY.get(self.trigger_reason, 99)

    @property
    def is_anonymized(self) -> bool:
        return self.student_id is None
