"""Tables 11-12: roadmaps and roadmap_milestones (FR-09, FR-10, FR-11, FR-12, FR-18)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import (
    JSONColumn,
    TimestampTZ,
    UUIDColumn,
    created_at_column,
    updated_at_column,
)

if TYPE_CHECKING:
    from app.models.catalog import CareerLibrary

ROADMAP_STATUSES = ("active", "paused", "completed", "reassessing")
TIMEFRAME_BUCKETS = ("next_7_days", "day_30", "day_90", "day_180")
MILESTONE_TYPES = (
    "exploration",
    "foundational_learning",
    "skill_check",
    "exam_prep",
    "project_output",
    "scholarship_application",
    "reassessment",
)
EVIDENCE_TYPES = ("self_report", "project_artifact", "quiz_score", "mentor_confirmation")


class Roadmap(Base):
    __tablename__ = "roadmaps"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'paused', 'completed', 'reassessing')",
            name="ck_roadmaps_status",
        ),
        Index("idx_roadmaps_student_current", "student_id", "is_current"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn,
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    primary_career_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("career_library.id"), nullable=False
    )
    # Optional: a student may commit to a primary before a backup feels realistic.
    backup_career_id: Mapped[str | None] = mapped_column(
        String(100), ForeignKey("career_library.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    superseded_at: Mapped[datetime | None] = mapped_column(TimestampTZ, nullable=True)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    milestones: Mapped[list[RoadmapMilestone]] = relationship(
        "RoadmapMilestone",
        back_populates="roadmap",
        cascade="all, delete-orphan",
        order_by="RoadmapMilestone.order_index",
    )
    primary_career: Mapped[CareerLibrary] = relationship(
        "CareerLibrary", foreign_keys=[primary_career_id]
    )
    backup_career: Mapped[CareerLibrary | None] = relationship(
        "CareerLibrary", foreign_keys=[backup_career_id]
    )


class RoadmapMilestone(Base):
    """A single step.

    `fallback_action` is non-nullable by design: every step must state what to do if
    it does not work out, so the plan degrades gracefully instead of dead-ending
    (FR-10, PRD Section 11).
    """

    __tablename__ = "roadmap_milestones"
    __table_args__ = (
        CheckConstraint(
            "timeframe_bucket IN ('next_7_days', 'day_30', 'day_90', 'day_180')",
            name="ck_roadmap_milestones_bucket",
        ),
        CheckConstraint(
            "milestone_type IN ('exploration', 'foundational_learning', 'skill_check', "
            "'exam_prep', 'project_output', 'scholarship_application', 'reassessment')",
            name="ck_roadmap_milestones_type",
        ),
        CheckConstraint(
            "completion_evidence_type IN ('self_report', 'project_artifact', "
            "'quiz_score', 'mentor_confirmation')",
            name="ck_roadmap_milestones_evidence_type",
        ),
        Index("idx_roadmap_milestones_roadmap", "roadmap_id"),
        Index("idx_roadmap_milestones_bucket", "timeframe_bucket"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    roadmap_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False
    )
    timeframe_bucket: Mapped[str] = mapped_column(String(50), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    milestone_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Milestone titles that must be completed first (Story 3.4 unlock rule).
    prerequisites: Mapped[list[str]] = mapped_column(JSONColumn, default=list, nullable=False)

    estimated_cost_inr: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_low_cost_or_free: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    free_resource_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    completion_evidence_type: Mapped[str] = mapped_column(
        String(50), default="self_report", nullable=False
    )
    completion_evidence_note_or_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(TimestampTZ, nullable=True)

    fallback_action: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = created_at_column()

    roadmap: Mapped[Roadmap] = relationship("Roadmap", back_populates="milestones")
