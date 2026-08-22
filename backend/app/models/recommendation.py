"""Tables 8-10: recommendation_batches, recommendations, parent_summaries.

History is never destroyed. A reassessment soft-supersedes the previous cycle
(`is_current = FALSE`, `superseded_at = NOW()`) rather than overwriting it, so a
student's full trajectory stays inspectable (FR-18).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import JSONColumn, TimestampTZ, UUIDColumn, created_at_column

if TYPE_CHECKING:
    from app.models.catalog import CareerLibrary

FIT_LABELS = ("Strong", "Moderate", "Emerging", "Insufficient evidence")
FEASIBILITY_LABELS = ("High", "Moderate", "Challenging", "Low")
EVIDENCE_LABELS = ("High", "Moderate", "Preliminary", "Sparse")


class RecommendationBatch(Base):
    """One scoring cycle. batch_number 1 is onboarding; 2+ are reassessments."""

    __tablename__ = "recommendation_batches"
    __table_args__ = (Index("idx_rec_batches_student_current", "student_id", "is_current"),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn,
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    batch_number: Mapped[int] = mapped_column(Integer, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    superseded_at: Mapped[datetime | None] = mapped_column(TimestampTZ, nullable=True)
    created_at: Mapped[datetime] = created_at_column()

    recommendations: Mapped[list[Recommendation]] = relationship(
        "Recommendation",
        back_populates="batch",
        cascade="all, delete-orphan",
        order_by="Recommendation.rank_position",
    )
    parent_summaries: Mapped[list[ParentSummary]] = relationship(
        "ParentSummary", back_populates="batch", cascade="all, delete-orphan"
    )


class Recommendation(Base):
    """One ranked career option with its decomposed, inspectable scores (FR-05/06/07)."""

    __tablename__ = "recommendations"
    __table_args__ = (
        CheckConstraint("rank_position BETWEEN 1 AND 5", name="ck_recommendations_rank"),
        CheckConstraint(
            "composite_score BETWEEN 0.0 AND 100.0", name="ck_recommendations_composite"
        ),
        CheckConstraint("fit_score BETWEEN 0.0 AND 100.0", name="ck_recommendations_fit"),
        CheckConstraint(
            "feasibility_score BETWEEN 0.0 AND 100.0", name="ck_recommendations_feasibility"
        ),
        CheckConstraint(
            "evidence_quality_score BETWEEN 0.0 AND 100.0", name="ck_recommendations_evidence"
        ),
        CheckConstraint(
            "fit_label IN ('Strong', 'Moderate', 'Emerging', 'Insufficient evidence')",
            name="ck_recommendations_fit_label",
        ),
        CheckConstraint(
            "feasibility_label IN ('High', 'Moderate', 'Challenging', 'Low')",
            name="ck_recommendations_feasibility_label",
        ),
        CheckConstraint(
            "evidence_quality_label IN ('High', 'Moderate', 'Preliminary', 'Sparse')",
            name="ck_recommendations_evidence_label",
        ),
        Index("idx_recommendations_batch", "batch_id"),
        Index("idx_recommendations_student_current", "student_id", "is_current"),
        Index("idx_recommendations_career", "career_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn,
        ForeignKey("recommendation_batches.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn,
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    career_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("career_library.id", ondelete="CASCADE"), nullable=False
    )
    # Denormalized so a superseded batch still reads correctly if the catalogue entry
    # is later retitled.
    career_title: Mapped[str] = mapped_column(String(255), nullable=False)
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False)

    composite_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    fit_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    feasibility_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    evidence_quality_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    fit_label: Mapped[str] = mapped_column(String(50), nullable=False)
    feasibility_label: Mapped[str] = mapped_column(String(50), nullable=False)
    evidence_quality_label: Mapped[str] = mapped_column(String(50), nullable=False)

    reasons: Mapped[list[str]] = mapped_column(JSONColumn, default=list, nullable=False)
    concerns: Mapped[list[str]] = mapped_column(JSONColumn, default=list, nullable=False)
    missing_evidence_flags: Mapped[list[str]] = mapped_column(
        JSONColumn, default=list, nullable=False
    )

    is_primary_selection: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_backup_selection: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    superseded_at: Mapped[datetime | None] = mapped_column(TimestampTZ, nullable=True)
    created_at: Mapped[datetime] = created_at_column()

    batch: Mapped[RecommendationBatch] = relationship(
        "RecommendationBatch", back_populates="recommendations"
    )
    career: Mapped[CareerLibrary] = relationship("CareerLibrary")


class ParentSummary(Base):
    """Persisted guardian summary (FR-17).

    Stored once per generation and read back verbatim, so a family never sees the
    wording shift between visits.
    """

    __tablename__ = "parent_summaries"
    __table_args__ = (
        Index("idx_parent_summaries_batch", "recommendation_batch_id"),
        Index("idx_parent_summaries_student", "student_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn,
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    recommendation_batch_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn,
        ForeignKey("recommendation_batches.id", ondelete="CASCADE"),
        nullable=False,
    )
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = created_at_column()

    batch: Mapped[RecommendationBatch] = relationship(
        "RecommendationBatch", back_populates="parent_summaries"
    )
