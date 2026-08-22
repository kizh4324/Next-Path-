"""Guardian summary DTOs (FR-17)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import StrictModel


class CostBreakdownItem(StrictModel):
    career_title: str
    route_name: str
    duration_years: int
    estimated_cost_inr_min: int
    estimated_cost_inr_max: int
    entrance_exams: list[str]
    low_cost_alternative_route: str | None = None


class ParentSummaryResponse(StrictModel):
    id: uuid.UUID | None
    student_id: uuid.UUID
    recommendation_batch_id: uuid.UUID
    # Read back verbatim from storage so the wording never shifts between visits (FR-17).
    summary_text: str
    generated_at: datetime | None

    cost_breakdown: list[CostBreakdownItem] = Field(default_factory=list)
    discussion_points: list[str] = Field(
        default_factory=list,
        description="Shared prompts to open a conversation rather than settle it",
    )
    guardian_priorities_reflected: list[str] = Field(default_factory=list)

    # True when the summary came from the deterministic template rather than the LLM
    # (no API key, or the provider was unreachable). Disclosed, not hidden.
    generated_without_ai: bool = False
