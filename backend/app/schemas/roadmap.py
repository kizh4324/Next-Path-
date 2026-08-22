"""Roadmap and milestone DTOs (FR-10, FR-11, FR-12)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field, model_validator

from app.schemas.common import ORMModel, StrictModel
from app.schemas.enums import (
    EvidenceType,
    MilestoneType,
    RoadmapStatus,
    SkillCategory,
    TimeframeBucket,
)


class MilestoneDTO(ORMModel):
    id: uuid.UUID
    roadmap_id: uuid.UUID
    timeframe_bucket: TimeframeBucket
    order_index: int
    title: str
    description: str
    milestone_type: MilestoneType
    prerequisites: list[str]
    estimated_cost_inr: int
    is_low_cost_or_free: bool
    free_resource_url: str | None
    completion_evidence_type: EvidenceType
    completion_evidence_note_or_url: str | None
    is_completed: bool
    completed_at: datetime | None
    # Never null. Every step states what to do if it does not work out (FR-10).
    fallback_action: str

    # Derived, not stored: whether unfinished prerequisites currently block this step.
    is_locked: bool = False
    blocked_by: list[str] = Field(default_factory=list)


class RoadmapResponse(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    primary_career_id: str
    primary_career_title: str
    backup_career_id: str | None
    backup_career_title: str | None
    status: RoadmapStatus
    is_current: bool
    superseded_at: datetime | None
    created_at: datetime
    milestones: list[MilestoneDTO]

    total_milestones: int = 0
    completed_milestones: int = 0
    total_estimated_cost_inr: int = 0
    free_milestone_count: int = 0


class MilestoneCompleteRequest(StrictModel):
    completion_evidence_type: EvidenceType = EvidenceType.SELF_REPORT
    completion_evidence_note_or_url: str | None = Field(
        default=None,
        max_length=2000,
        description="Required for every evidence type except self_report.",
    )

    @model_validator(mode="after")
    def _evidence_required_when_claimed(self) -> MilestoneCompleteRequest:
        needs_proof = self.completion_evidence_type != EvidenceType.SELF_REPORT
        if needs_proof and not (self.completion_evidence_note_or_url or "").strip():
            raise ValueError(
                f"completion_evidence_note_or_url is required when "
                f"completion_evidence_type is '{self.completion_evidence_type.value}'."
            )
        return self


class SkillGapItem(StrictModel):
    skill_name: str
    category: SkillCategory
    description: str
    is_already_held: bool = Field(
        description="True when the student's self-reported strengths already cover this"
    )
    free_learning_resource_name: str
    free_learning_resource_url: str
    commercial_disclosure: str


class SkillGapResponse(StrictModel):
    career_id: str
    career_title: str
    essential: list[SkillGapItem]
    useful: list[SkillGapItem]
    optional: list[SkillGapItem]
    gap_count_essential: int
    free_first_note: str = Field(
        default=(
            "Every skill below lists a free route first. Paid options appear only where "
            "one exists, and we take no commission from any provider."
        )
    )
