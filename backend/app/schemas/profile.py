"""Student and guardian profile DTOs (FR-01, FR-02, FR-03)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field, field_validator, model_validator

from app.schemas.common import ORMModel, StrictModel
from app.schemas.enums import (
    RIASEC_KEYS,
    BudgetTier,
    ConsentType,
    EducationStage,
    RelocationWillingness,
)

# Weighting used to derive profile_completeness_pct. Interests and aptitude carry the
# most weight because they are what the Fit half of the score is computed from — a
# profile missing them cannot produce a defensible recommendation.
COMPLETENESS_WEIGHTS: dict[str, int] = {
    "education_stage": 10,
    "grade_or_year": 5,
    "interests": 25,
    "aptitude_signals": 20,
    "work_style_preferences": 10,
    "budget_tier": 10,
    "relocation_willingness": 10,
    "guardian_context": 5,
    "academic_records": 5,
}


class InterestEntry(StrictModel):
    """One self-reported interest, tagged to a Holland dimension where known."""

    label: str = Field(min_length=1, max_length=120, description="Student's own wording")
    riasec: str | None = Field(
        default=None,
        description="One of R/I/A/S/E/C, or null when the student's phrasing maps to none",
    )
    strength: int = Field(default=3, ge=1, le=5, description="Self-rated pull, 1-5")

    @field_validator("riasec")
    @classmethod
    def _valid_riasec(cls, value: str | None) -> str | None:
        if value is None:
            return None
        upper = value.strip().upper()
        if upper not in RIASEC_KEYS:
            raise ValueError(f"riasec must be one of {', '.join(RIASEC_KEYS)}")
        return upper


class StudentProfileCreate(StrictModel):
    """Onboarding submission.

    Academic marks are deliberately not required (FR-01, PRD Section 17): a student who
    will not or cannot share marks must still get a usable result, with the gap
    reflected honestly in evidence quality rather than blocking the journey.
    """

    education_stage: EducationStage
    grade_or_year: str = Field(min_length=1, max_length=100, description="e.g. 'Class 10', 'B.Sc Year 2'")
    current_stream: str | None = Field(default=None, max_length=100)

    interests: list[InterestEntry] = Field(default_factory=list)
    aptitude_signals: dict[str, int] = Field(
        default_factory=dict,
        description="Self-rated strength per subject/domain, 1-5. e.g. {'mathematics': 4}",
    )
    work_style_preferences: dict[str, str] = Field(
        default_factory=dict,
        description="e.g. {'setting': 'indoor', 'people_contact': 'small_team'}",
    )

    budget_tier: BudgetTier = BudgetTier.MODERATE_UP_TO_2L
    relocation_willingness: RelocationWillingness = RelocationWillingness.WITHIN_STATE
    preferred_languages: list[str] = Field(default_factory=lambda: ["English", "Hindi"])
    academic_records_available: bool = False

    @field_validator("aptitude_signals")
    @classmethod
    def _ratings_in_range(cls, value: dict[str, int]) -> dict[str, int]:
        for key, rating in value.items():
            if not 1 <= rating <= 5:
                raise ValueError(f"aptitude_signals['{key}'] must be between 1 and 5")
        return value


class StudentProfileUpdate(StrictModel):
    """Partial update. Every field optional; only what is sent is changed."""

    grade_or_year: str | None = Field(default=None, max_length=100)
    current_stream: str | None = Field(default=None, max_length=100)
    interests: list[InterestEntry] | None = None
    aptitude_signals: dict[str, int] | None = None
    work_style_preferences: dict[str, str] | None = None
    budget_tier: BudgetTier | None = None
    relocation_willingness: RelocationWillingness | None = None
    preferred_languages: list[str] | None = None
    academic_records_available: bool | None = None


class GuardianContextCreate(StrictModel):
    guardian_name: str | None = Field(default=None, max_length=255)
    relationship_to_student: str = Field(min_length=1, max_length=100)
    guardian_priorities: list[str] = Field(
        default_factory=list,
        description="e.g. ['job security', 'affordable fees', 'stays near home']",
    )
    financial_ceiling_inr: int | None = Field(
        default=None, ge=0, description="Hard annual ceiling; overrides the student's budget tier"
    )
    relocation_restriction: RelocationWillingness = RelocationWillingness.WITHIN_STATE
    notes_and_concerns: str | None = None


class GuardianContextResponse(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    guardian_name: str | None
    relationship_to_student: str
    guardian_priorities: list[str]
    financial_ceiling_inr: int | None
    relocation_restriction: RelocationWillingness
    notes_and_concerns: str | None
    created_at: datetime


class StudentProfileResponse(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    education_stage: EducationStage
    grade_or_year: str
    current_stream: str | None
    interests: list[dict[str, object]]
    aptitude_signals: dict[str, int]
    work_style_preferences: dict[str, str]
    budget_tier: BudgetTier
    relocation_willingness: RelocationWillingness
    preferred_languages: list[str]
    consent_type: ConsentType
    consent_given_by: uuid.UUID | None
    consent_recorded_at: datetime
    academic_records_available: bool
    profile_completeness_pct: int
    created_at: datetime
    updated_at: datetime

    guardian_contexts: list[GuardianContextResponse] = Field(default_factory=list)


class ProfileStatusResponse(StrictModel):
    """What the frontend needs to decide which gate to show next."""

    profile_exists: bool
    profile_completeness_pct: int
    is_minor_stage: bool
    consent_required: bool
    consent_recorded: bool
    can_generate_recommendations: bool
    blocking_reason: str | None = None

    @model_validator(mode="after")
    def _reason_present_when_blocked(self) -> ProfileStatusResponse:
        if not self.can_generate_recommendations and not self.blocking_reason:
            raise ValueError("blocking_reason is required when recommendations are blocked")
        return self
