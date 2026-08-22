"""Recommendation DTOs (FR-05, FR-06, FR-07, FR-09)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field, model_validator

from app.schemas.catalog import CareerSummaryDTO
from app.schemas.common import ORMModel, StrictModel
from app.schemas.enums import EvidenceQualityLabel, FeasibilityLabel, FitLabel


class ScoreBreakdown(StrictModel):
    """Every number that fed the composite, kept inspectable (FR-06).

    This is the whole reason the engine is a weighted sum rather than a model: each
    contribution below is a stored number a counselor can argue with.
    """

    riasec_alignment: float = Field(ge=0, le=100)
    aptitude_signal_match: float = Field(ge=0, le=100)
    budget_compatibility: float = Field(ge=0, le=100)
    relocation_fit: float = Field(ge=0, le=100)
    stage_eligibility: float = Field(ge=0, le=100)
    profile_completeness_pct: float = Field(ge=0, le=100)
    records_weight: float = Field(ge=0, le=100)
    evidence_penalty: float = Field(
        ge=0, description="Points subtracted from the composite for thin evidence"
    )


class RecommendationDTO(ORMModel):
    id: uuid.UUID
    career_id: str
    career_title: str
    rank_position: int = Field(ge=1, le=5)

    composite_score: float = Field(ge=0, le=100)
    fit_score: float = Field(ge=0, le=100)
    feasibility_score: float = Field(ge=0, le=100)
    evidence_quality_score: float = Field(ge=0, le=100)

    fit_label: FitLabel
    feasibility_label: FeasibilityLabel
    evidence_quality_label: EvidenceQualityLabel

    reasons: list[str]
    concerns: list[str]
    missing_evidence_flags: list[str]

    is_primary_selection: bool
    is_backup_selection: bool
    created_at: datetime

    career: CareerSummaryDTO | None = None


class RecommendationBatchResponse(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    batch_number: int
    is_current: bool
    superseded_at: datetime | None
    created_at: datetime
    recommendations: list[RecommendationDTO]

    # Shown verbatim above the results. The PRD forbids presenting this as a verdict,
    # so the framing ships with the data rather than being left to the frontend.
    decision_support_notice: str = Field(
        default=(
            "These are options to consider and discuss — not a prediction of your future "
            "or a single correct answer. Each one shows why it appeared, what would make "
            "it harder, and what we still do not know about you."
        )
    )


class ScoredCareerPreview(StrictModel):
    """Engine output before persistence. Used by tests and the batching service."""

    career_id: str
    career_title: str
    composite_score: float
    fit_score: float
    feasibility_score: float
    evidence_quality_score: float
    fit_label: FitLabel
    feasibility_label: FeasibilityLabel
    evidence_quality_label: EvidenceQualityLabel
    reasons: list[str]
    concerns: list[str]
    missing_evidence_flags: list[str]
    breakdown: ScoreBreakdown


class PathwaySelectRequest(StrictModel):
    primary_career_id: str = Field(min_length=1)
    backup_career_id: str | None = Field(
        default=None,
        description="Optional. A student may commit to a primary before a backup feels real.",
    )

    @model_validator(mode="after")
    def _backup_differs(self) -> PathwaySelectRequest:
        if self.backup_career_id and self.backup_career_id == self.primary_career_id:
            raise ValueError("Backup pathway must differ from the primary pathway.")
        return self


class PathwaySelectResponse(StrictModel):
    roadmap_id: uuid.UUID
    primary_career_id: str
    backup_career_id: str | None
    milestones_created: int
    message: str
