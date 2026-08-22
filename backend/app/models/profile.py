"""Tables 2-3: student_profiles and guardian_contexts (FR-01, FR-02, FR-03, FR-20)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.types import (
    JSONColumn,
    UUIDColumn,
    created_at_column,
    updated_at_column,
)

if TYPE_CHECKING:
    from app.models.user import User

EDUCATION_STAGES = ("class_8_10", "class_11_12", "early_college")
BUDGET_TIERS = ("low_cost_only", "moderate_up_to_2_lakhs", "flexible_above_2_lakhs")
RELOCATION_OPTIONS = ("home_district_only", "within_state", "anywhere_in_india", "abroad")
CONSENT_TYPES = ("guardian_consent_minor", "self_consent_adult")

# Stages whose students are presumed minors and therefore require guardian consent
# before any recommendation may be generated (FR-20, Story 2.3).
MINOR_STAGES = ("class_8_10", "class_11_12")


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    __table_args__ = (
        CheckConstraint(
            "education_stage IN ('class_8_10', 'class_11_12', 'early_college')",
            name="ck_student_profiles_stage",
        ),
        CheckConstraint(
            "budget_tier IN ('low_cost_only', 'moderate_up_to_2_lakhs', "
            "'flexible_above_2_lakhs')",
            name="ck_student_profiles_budget",
        ),
        CheckConstraint(
            "relocation_willingness IN ('home_district_only', 'within_state', "
            "'anywhere_in_india', 'abroad')",
            name="ck_student_profiles_relocation",
        ),
        CheckConstraint(
            "consent_type IN ('guardian_consent_minor', 'self_consent_adult')",
            name="ck_student_profiles_consent_type",
        ),
        CheckConstraint(
            "profile_completeness_pct BETWEEN 0 AND 100",
            name="ck_student_profiles_completeness",
        ),
        Index("idx_student_profiles_user", "user_id"),
        Index("idx_student_profiles_stage", "education_stage"),
        Index(
            "idx_student_profiles_interests",
            "interests",
            postgresql_using="gin",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    education_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    grade_or_year: Mapped[str] = mapped_column(String(100), nullable=False)
    current_stream: Mapped[str | None] = mapped_column(String(100), nullable=True)

    interests: Mapped[list[Any]] = mapped_column(JSONColumn, default=list, nullable=False)
    aptitude_signals: Mapped[dict[str, Any]] = mapped_column(
        JSONColumn, default=dict, nullable=False
    )
    work_style_preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONColumn, default=dict, nullable=False
    )

    budget_tier: Mapped[str] = mapped_column(
        String(50), default="moderate_up_to_2_lakhs", nullable=False
    )
    relocation_willingness: Mapped[str] = mapped_column(
        String(50), default="within_state", nullable=False
    )
    preferred_languages: Mapped[list[str]] = mapped_column(
        JSONColumn, default=lambda: ["English", "Hindi"], nullable=False
    )

    # --- Minor consent & governance (FR-20) ---
    consent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Mandatory for class_8_10 / class_11_12; NULL only for a self-consenting adult.
    consent_given_by: Mapped[uuid.UUID | None] = mapped_column(
        UUIDColumn, ForeignKey("users.id"), nullable=True
    )
    consent_recorded_at: Mapped[datetime] = created_at_column()

    academic_records_available: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    profile_completeness_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    user: Mapped[User] = relationship(
        "User", back_populates="profile", foreign_keys=[user_id]
    )
    guardian_contexts: Mapped[list[GuardianContext]] = relationship(
        "GuardianContext",
        back_populates="student",
        cascade="all, delete-orphan",
    )

    @property
    def is_minor_stage(self) -> bool:
        return self.education_stage in MINOR_STAGES

    @property
    def has_valid_minor_consent(self) -> bool:
        """True when a minor's guardian consent is fully recorded (FR-20)."""
        return (
            self.consent_type == "guardian_consent_minor" and self.consent_given_by is not None
        )


class GuardianContext(Base):
    __tablename__ = "guardian_contexts"
    __table_args__ = (
        CheckConstraint(
            "relocation_restriction IN ('home_district_only', 'within_state', "
            "'anywhere_in_india', 'abroad')",
            name="ck_guardian_contexts_relocation",
        ),
        Index("idx_guardian_contexts_student", "student_id"),
        Index(
            "uq_guardian_student",
            "student_id",
            "relationship_to_student",
            unique=True,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDColumn, primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUIDColumn,
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    guardian_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    relationship_to_student: Mapped[str] = mapped_column(String(100), nullable=False)
    guardian_priorities: Mapped[list[str]] = mapped_column(
        JSONColumn, default=list, nullable=False
    )
    financial_ceiling_inr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    relocation_restriction: Mapped[str] = mapped_column(
        String(50), default="within_state", nullable=False
    )
    notes_and_concerns: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = created_at_column()
    updated_at: Mapped[datetime] = updated_at_column()

    student: Mapped[StudentProfile] = relationship(
        "StudentProfile", back_populates="guardian_contexts"
    )
