"""Career library, skills, scholarships, and market snapshot DTOs (FR-04, FR-13, FR-14)."""

from __future__ import annotations

import uuid
from datetime import date

from pydantic import Field, model_validator

from app.schemas.common import EvidenceUnavailable, ORMModel, StrictModel
from app.schemas.enums import (
    BudgetTier,
    DemandIndicator,
    EducationStage,
    RelocationWillingness,
    SkillCategory,
    SponsorType,
)


class IndiaEntryRoute(StrictModel):
    """One concrete way into this career in India (FR-04).

    `low_cost_alternative_route` is what makes the free-first principle real for a
    student whose budget cannot reach the standard route.
    """

    route_name: str = Field(description="e.g. 'Standard B.Tech Engineering Pathway'")
    duration_years: int = Field(ge=1, le=15)
    entrance_exams: list[str] = Field(
        default_factory=list, description="e.g. ['JEE Main', 'MHT-CET', 'CUET']"
    )
    cost_tier: BudgetTier
    estimated_cost_inr_min: int = Field(ge=0, description="Total, not annual")
    estimated_cost_inr_max: int = Field(ge=0, description="Total, not annual")
    degree_or_cert_awarded: str
    low_cost_alternative_route: str | None = None

    # Extends the value object defined in data-models.md §3.3. The Relocation_Fit term
    # in core-workflows.md §1.1 scores "100 if education/jobs exist within the student's
    # relocation_willingness" — that requires the data to record where a route is
    # actually reachable, and no other field carries it. Recorded in the authored seed;
    # a route without it scores neutrally rather than being penalised.
    availability_scope: RelocationWillingness = Field(
        default=RelocationWillingness.WITHIN_STATE,
        description="Narrowest geography in which this route is realistically reachable",
    )

    @model_validator(mode="after")
    def _cost_range_ordered(self) -> IndiaEntryRoute:
        if self.estimated_cost_inr_max < self.estimated_cost_inr_min:
            raise ValueError("estimated_cost_inr_max must be >= estimated_cost_inr_min")
        return self


class CareerSkillDTO(ORMModel):
    id: uuid.UUID
    career_id: str
    skill_name: str
    category: SkillCategory
    description: str
    free_learning_resource_name: str
    free_learning_resource_url: str
    paid_learning_resource_name: str | None
    paid_learning_resource_url: str | None
    commercial_disclosure: str


class MarketSnapshotDTO(ORMModel):
    id: uuid.UUID
    career_id: str
    geography: str
    timeframe_period: str
    data_source: str
    demand_indicator: DemandIndicator
    salary_range_entry_inr: str
    salary_range_mid_inr: str
    top_demanded_skills: list[dict[str, object]]
    top_hiring_locations: list[dict[str, object]]
    experience_distribution: dict[str, object]
    competition_caveat: str
    uncertainty_statement: str
    last_updated_date: date


class CareerSummaryDTO(ORMModel):
    """Compact card representation used in lists and comparison columns."""

    id: str
    title: str
    cluster: str
    description: str
    job_zone: int
    riasec_code: str
    applicable_stages: list[EducationStage]
    india_entry_routes: list[IndiaEntryRoute]
    risks_and_tradeoffs: list[str]
    last_reviewed_date: date


class CareerDetailDTO(ORMModel):
    id: str
    onet_soc_code: str
    title: str
    cluster: str
    description: str
    work_reality_summary: str
    applicable_stages: list[EducationStage]
    job_zone: int
    riasec_code: str
    riasec_scores: dict[str, float]
    india_entry_routes: list[IndiaEntryRoute]
    prerequisites: list[str]
    risks_and_tradeoffs: list[str]
    regional_caveats: str | None

    # Governance, surfaced to the student rather than hidden in the database.
    content_owner: str
    review_cycle_months: int
    last_reviewed_date: date
    source_links: list[str]

    skills: list[CareerSkillDTO] = Field(default_factory=list)
    # Exactly one of these is populated. A career with no verified market data returns
    # the unavailable state rather than an estimate (PRD Section 13.2).
    market_snapshot: MarketSnapshotDTO | None = None
    market_evidence_unavailable: EvidenceUnavailable | None = None


class CareerCompareRequest(StrictModel):
    career_ids: list[str] = Field(
        min_length=2,
        max_length=3,
        description="2-3 career slugs. More than three stops being comparable on a phone.",
    )


class ComparisonRow(StrictModel):
    """One comparison dimension rendered as a table row across career columns."""

    dimension: str = Field(description="e.g. 'Entrance exams', 'Estimated total cost'")
    values: dict[str, str] = Field(description="career_id -> displayable value")
    note: str | None = Field(
        default=None, description="Caveat shown under the row, e.g. a missing-evidence note"
    )


class CareerCompareResponse(StrictModel):
    careers: list[CareerSummaryDTO]
    rows: list[ComparisonRow]
    careers_without_market_evidence: list[str] = Field(
        default_factory=list,
        description="Slugs with no dataset-derived market snapshot, named explicitly",
    )


class ScholarshipDTO(ORMModel):
    id: int
    name: str
    state: str
    sponsor_type: SponsorType
    target_category: str
    income_ceiling_inr: int
    min_qualification: str
    amount_description: str
    eligibility_summary: str
    deadline_description: str
    required_documents: list[str]
    official_source_url: str
    last_verified_date: date
    renewal_conditions: str | None
    is_active: bool


class ScholarshipListResponse(StrictModel):
    total: int
    results: list[ScholarshipDTO]
    coverage_note: str = Field(
        description=(
            "States actually represented in the catalogue. Surfaced so an empty result "
            "reads as 'not in our data' rather than 'no scholarship exists'."
        )
    )


# --- Syllabus, Projects, and Trajectory DTOs (Epic 7 / roadmap.sh Alignment) ---


class TopicItemDTO(StrictModel):
    id: int
    topic_title: str
    description: str
    key_concepts: list[str] = Field(default_factory=list)
    free_resource_name: str
    free_resource_url: str
    estimated_hours: int = 10
    is_optional: bool = False


class SyllabusPhaseDTO(StrictModel):
    phase_number: int
    phase_title: str
    topics: list[TopicItemDTO] = Field(default_factory=list)


class CareerSyllabusResponse(StrictModel):
    career_id: str
    career_title: str
    total_estimated_hours: int
    phases: list[SyllabusPhaseDTO] = Field(default_factory=list)


class SkillProjectIdeaDTO(ORMModel):
    id: str
    career_id: str
    difficulty: str
    title: str
    tag: str
    summary: str
    requirements: list[str] = Field(default_factory=list)
    skills_exercised: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    example_input_output: str | None = None


class CareerProjectsResponse(StrictModel):
    career_id: str
    career_title: str
    projects: list[SkillProjectIdeaDTO] = Field(default_factory=list)


class ProjectSubmitRequest(StrictModel):
    repository_or_live_url: str = Field(
        min_length=5, max_length=500, description="Public GitHub repository, Figma, or deployed app URL"
    )
    reflection_notes: str | None = Field(
        default=None, max_length=2000, description="Self-reflection on challenges and learnings"
    )


class ProjectSubmissionDTO(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    project_id: str
    repository_or_live_url: str
    reflection_notes: str | None = None
    status: str
    submitted_at: object


class CareerTrajectoryDTO(ORMModel):
    id: int
    source_career_id: str
    target_career_title: str
    trajectory_type: str
    typical_years_experience: str
    expected_salary_delta_inr: str
    required_delta_skills: list[str] = Field(default_factory=list)
    transferable_skills_pct: int
    overview: str


class CareerTrajectoryResponse(StrictModel):
    source_career_id: str
    source_career_title: str
    trajectories: list[CareerTrajectoryDTO] = Field(default_factory=list)

