"""Unit tests for the deterministic scoring engine (Stories 2.1, 2.2).

These assert the published formulas and cutoffs from core-workflows.md §1.1-1.2. If a
weight changes, these fail — which is the point: the numbers are a product decision,
not an implementation detail.
"""

from __future__ import annotations

import time

import pytest

from app.modules.scoring_engine import (
    BUDGET_TIER_ANNUAL_CEILING_INR,
    RELOCATION_FIT_BEYOND_BOUNDARY,
    RELOCATION_FIT_WITHIN_BOUNDARY,
    STAGE_ELIGIBILITY_BRIDGE_REQUIRED,
    STAGE_ELIGIBILITY_DIRECT,
    CareerScoringInput,
    StudentScoringProfile,
    assign_evidence_label,
    assign_feasibility_label,
    assign_fit_label,
    budget_compatibility,
    build_riasec_vector,
    collect_missing_evidence,
    derive_aptitude_domains,
    evidence_quality,
    rank_careers,
    relocation_fit,
    riasec_alignment,
    score_career,
    stage_eligibility,
)
from app.schemas.enums import (
    BudgetTier,
    EvidenceQualityLabel,
    FeasibilityLabel,
    FitLabel,
    RelocationWillingness,
)


# --------------------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------------------
def make_student(**overrides: object) -> StudentScoringProfile:
    defaults: dict[str, object] = {
        "education_stage": "class_11_12",
        "current_stream": "Science (PCM)",
        "riasec_vector": {"R": 2.0, "I": 5.0, "A": 1.0, "S": 2.0, "E": 2.0, "C": 4.0},
        "aptitude_signals": {"mathematics": 4, "computers": 5, "physics": 3},
        "budget_tier": BudgetTier.MODERATE_UP_TO_2L,
        "relocation_willingness": RelocationWillingness.WITHIN_STATE,
        "profile_completeness_pct": 80,
        "academic_records_available": True,
    }
    defaults.update(overrides)
    return StudentScoringProfile(**defaults)  # type: ignore[arg-type]


def make_career(**overrides: object) -> CareerScoringInput:
    defaults: dict[str, object] = {
        "career_id": "data-scientist",
        "title": "Data Scientist",
        "cluster": "Data & AI",
        "job_zone": 4,
        "riasec_scores": {"R": 1.5, "I": 6.5, "A": 2.0, "S": 2.0, "E": 3.0, "C": 4.5},
        "applicable_stages": ["class_11_12", "early_college"],
        "entry_routes": [
            {
                "route_name": "B.Tech Computer Science",
                "duration_years": 4,
                "entrance_exams": ["JEE Main"],
                "cost_tier": "moderate_up_to_2_lakhs",
                "estimated_cost_inr_min": 200_000,
                "estimated_cost_inr_max": 600_000,
                "degree_or_cert_awarded": "B.Tech",
                "availability_scope": "within_state",
                "low_cost_alternative_route": None,
            }
        ],
        "prerequisites": ["Mathematics in 10+2"],
        "risks_and_tradeoffs": ["Entry-level competition is high."],
        "essential_skills": ["Python Programming", "Statistical Inference"],
        "has_market_evidence": True,
        "has_funded_route": False,
    }
    defaults.update(overrides)
    return CareerScoringInput(**defaults)  # type: ignore[arg-type]


# --------------------------------------------------------------------------------------
# Label cutoffs (Story 2.2)
# --------------------------------------------------------------------------------------
@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (100.0, FitLabel.STRONG),
        (75.0, FitLabel.STRONG),
        (74.99, FitLabel.MODERATE),
        (55.0, FitLabel.MODERATE),
        (54.99, FitLabel.EMERGING),
        (35.0, FitLabel.EMERGING),
        (34.99, FitLabel.INSUFFICIENT_EVIDENCE),
        (0.0, FitLabel.INSUFFICIENT_EVIDENCE),
    ],
)
def test_fit_label_boundaries(score: float, expected: FitLabel) -> None:
    assert assign_fit_label(score) is expected


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (75.0, FeasibilityLabel.HIGH),
        (74.99, FeasibilityLabel.MODERATE),
        (50.0, FeasibilityLabel.MODERATE),
        (49.99, FeasibilityLabel.CHALLENGING),
        (30.0, FeasibilityLabel.CHALLENGING),
        (29.99, FeasibilityLabel.LOW),
    ],
)
def test_feasibility_label_boundaries(score: float, expected: FeasibilityLabel) -> None:
    assert assign_feasibility_label(score) is expected


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (80.0, EvidenceQualityLabel.HIGH),
        (79.99, EvidenceQualityLabel.MODERATE),
        (50.0, EvidenceQualityLabel.MODERATE),
        (49.99, EvidenceQualityLabel.PRELIMINARY),
        (30.0, EvidenceQualityLabel.PRELIMINARY),
        (29.99, EvidenceQualityLabel.SPARSE),
    ],
)
def test_evidence_label_boundaries(score: float, expected: EvidenceQualityLabel) -> None:
    assert assign_evidence_label(score) is expected


# --------------------------------------------------------------------------------------
# Component scores
# --------------------------------------------------------------------------------------
def test_riasec_vector_ignores_untagged_interests() -> None:
    vector = build_riasec_vector(
        [
            {"label": "solving puzzles", "riasec": "I", "strength": 5},
            {"label": "something vague", "riasec": None, "strength": 5},
            {"label": "lowercase tag", "riasec": "c", "strength": 2},
        ]
    )
    assert vector["I"] == 5.0
    assert vector["C"] == 2.0
    assert sum(vector.values()) == 7.0


def test_riasec_alignment_is_perfect_for_identical_direction() -> None:
    profile = {"R": 0.0, "I": 6.0, "A": 0.0, "S": 0.0, "E": 0.0, "C": 0.0}
    career = make_career(riasec_scores={"R": 0.0, "I": 3.0, "A": 0.0, "S": 0.0, "E": 0.0, "C": 0.0})
    result = riasec_alignment(make_student(riasec_vector=profile), career)
    # Cosine similarity is scale-invariant: same direction is a perfect match.
    assert result.value == pytest.approx(100.0)


def test_riasec_alignment_is_zero_with_no_tagged_interests() -> None:
    student = make_student(riasec_vector=dict.fromkeys("RIASEC", 0.0))
    result = riasec_alignment(student, make_career())
    assert result.value == 0.0
    assert any("interest type" in c for c in result.concerns)


def test_aptitude_unrated_domains_dilute_rather_than_being_ignored() -> None:
    """A domain the student never rated must not be treated as a strength."""
    rated_all = make_student(aptitude_signals={"mathematics": 5, "computers": 5})
    rated_one = make_student(aptitude_signals={"mathematics": 5})
    career = make_career(
        prerequisites=["Mathematics in 10+2"], essential_skills=["Python Programming"]
    )
    assert score_career(rated_all, career).breakdown.aptitude_signal_match > (
        score_career(rated_one, career).breakdown.aptitude_signal_match
    )


def test_derive_aptitude_domains_uses_exact_keywords() -> None:
    domains = derive_aptitude_domains(
        ["Physics, Chemistry, Biology in 10+2"], ["Clinical Assessment"]
    )
    assert {"physics", "chemistry", "biology"} <= domains
    assert "commerce" not in domains


# --------------------------------------------------------------------------------------
# Feasibility
# --------------------------------------------------------------------------------------
def test_budget_full_score_when_route_fits_annual_ceiling() -> None:
    student = make_student(budget_tier=BudgetTier.MODERATE_UP_TO_2L)
    # 600000 over 4 years = 150000/yr, under the 200000 moderate ceiling.
    result = budget_compatibility(student, make_career())
    assert result.value == 100.0


def test_budget_penalised_proportionally_when_over_ceiling() -> None:
    student = make_student(budget_tier=BudgetTier.LOW_COST_ONLY)  # 50,000/yr ceiling
    result = budget_compatibility(student, make_career())  # 150,000/yr
    # 50000/150000 = 1/3 -> 33.33, and never a hard zero.
    assert result.value == pytest.approx(33.33, abs=0.01)
    assert result.concerns


def test_guardian_ceiling_overrides_a_looser_student_tier() -> None:
    student = make_student(
        budget_tier=BudgetTier.FLEXIBLE_ABOVE_2L,
        guardian_financial_ceiling_inr=40_000,
    )
    assert student.effective_annual_budget_inr == 40_000
    assert budget_compatibility(student, make_career()).value < 50.0


def test_guardian_ceiling_never_loosens_a_tighter_student_tier() -> None:
    student = make_student(
        budget_tier=BudgetTier.LOW_COST_ONLY,
        guardian_financial_ceiling_inr=900_000,
    )
    assert student.effective_annual_budget_inr == BUDGET_TIER_ANNUAL_CEILING_INR[
        BudgetTier.LOW_COST_ONLY
    ]


def test_relocation_within_boundary_scores_full() -> None:
    student = make_student(relocation_willingness=RelocationWillingness.WITHIN_STATE)
    assert relocation_fit(student, make_career()).value == RELOCATION_FIT_WITHIN_BOUNDARY


def test_relocation_beyond_boundary_scores_forty() -> None:
    student = make_student(relocation_willingness=RelocationWillingness.HOME_DISTRICT_ONLY)
    assert relocation_fit(student, make_career()).value == RELOCATION_FIT_BEYOND_BOUNDARY


def test_guardian_relocation_restriction_tightens_boundary() -> None:
    student = make_student(
        relocation_willingness=RelocationWillingness.ANYWHERE_IN_INDIA,
        guardian_relocation_restriction=RelocationWillingness.HOME_DISTRICT_ONLY,
    )
    assert student.effective_relocation is RelocationWillingness.HOME_DISTRICT_ONLY
    result = relocation_fit(student, make_career())
    assert result.value == RELOCATION_FIT_BEYOND_BOUNDARY
    assert any("guardian" in c.lower() for c in result.concerns)


def test_stage_eligibility_direct_when_stream_matches() -> None:
    student = make_student(current_stream="Science (PCM)")
    assert stage_eligibility(student, make_career()).value == STAGE_ELIGIBILITY_DIRECT


def test_stage_eligibility_bridge_when_stream_mismatches() -> None:
    student = make_student(current_stream="Commerce")
    assert stage_eligibility(student, make_career()).value == STAGE_ELIGIBILITY_BRIDGE_REQUIRED


def test_class_8_10_student_is_not_penalised_for_having_no_stream_yet() -> None:
    """A stream requirement is information about the choice ahead, not a rejection."""
    student = make_student(education_stage="class_8_10", current_stream=None)
    result = stage_eligibility(student, make_career(applicable_stages=["class_8_10"]))
    assert result.value == STAGE_ELIGIBILITY_DIRECT
    assert result.reasons


# --------------------------------------------------------------------------------------
# Evidence quality and the composite
# --------------------------------------------------------------------------------------
def test_evidence_quality_formula() -> None:
    score, weight = evidence_quality(
        make_student(profile_completeness_pct=80, academic_records_available=True)
    )
    assert weight == 100.0
    assert score == pytest.approx(0.70 * 80 + 0.30 * 100)  # 86.0


def test_evidence_quality_without_records() -> None:
    score, weight = evidence_quality(
        make_student(profile_completeness_pct=60, academic_records_available=False)
    )
    assert weight == 40.0
    assert score == pytest.approx(0.70 * 60 + 0.30 * 40)  # 54.0


def test_composite_matches_published_formula() -> None:
    student = make_student()
    result = score_career(student, make_career())
    b = result.breakdown

    fit = 0.60 * b.riasec_alignment + 0.40 * b.aptitude_signal_match
    feas = 0.45 * b.budget_compatibility + 0.35 * b.relocation_fit + 0.20 * b.stage_eligibility
    evid = 0.70 * b.profile_completeness_pct + 0.30 * b.records_weight
    expected = max(0.0, 0.55 * fit + 0.45 * feas - 0.10 * (100 - evid))

    assert result.fit_score == pytest.approx(fit, abs=0.01)
    assert result.feasibility_score == pytest.approx(feas, abs=0.01)
    assert result.evidence_quality_score == pytest.approx(evid, abs=0.01)
    assert result.composite_score == pytest.approx(expected, abs=0.01)


def test_composite_never_negative_for_a_worst_case_profile() -> None:
    student = make_student(
        riasec_vector=dict.fromkeys("RIASEC", 0.0),
        aptitude_signals={},
        profile_completeness_pct=0,
        academic_records_available=False,
        budget_tier=BudgetTier.LOW_COST_ONLY,
        relocation_willingness=RelocationWillingness.HOME_DISTRICT_ONLY,
        current_stream=None,
    )
    result = score_career(student, make_career())
    assert result.composite_score >= 0.0
    assert result.fit_label is FitLabel.INSUFFICIENT_EVIDENCE


def test_scoring_is_deterministic_across_repeated_runs() -> None:
    student, career = make_student(), make_career()
    first = score_career(student, career)
    for _ in range(20):
        assert score_career(student, career) == first


# --------------------------------------------------------------------------------------
# Explainability (FR-06)
# --------------------------------------------------------------------------------------
def test_authored_risks_always_reach_the_student() -> None:
    career = make_career(risks_and_tradeoffs=["Market is saturated at entry level."])
    assert "Market is saturated at entry level." in score_career(make_student(), career).concerns


def test_missing_market_evidence_is_flagged_not_hidden() -> None:
    flags = collect_missing_evidence(make_student(), make_career(has_market_evidence=False))
    assert any("job-market evidence" in f for f in flags)


def test_complete_profile_with_records_has_no_evidence_gaps() -> None:
    student = make_student(profile_completeness_pct=100, academic_records_available=True)
    assert collect_missing_evidence(student, make_career()) == []


# --------------------------------------------------------------------------------------
# Ranking (FR-05)
# --------------------------------------------------------------------------------------
def _career_set() -> list[CareerScoringInput]:
    return [
        make_career(career_id="data-scientist", title="Data Scientist", cluster="Data & AI"),
        make_career(career_id="data-analyst", title="Data Analyst", cluster="Data & AI"),
        make_career(career_id="ml-engineer", title="ML Engineer", cluster="Data & AI"),
        make_career(
            career_id="civil-engineer",
            title="Civil Engineer",
            cluster="Engineering",
            riasec_scores={"R": 6.0, "I": 4.0, "A": 2.0, "S": 2.0, "E": 3.0, "C": 4.0},
        ),
        make_career(
            career_id="chartered-accountant",
            title="Chartered Accountant",
            cluster="Commerce & Finance",
            riasec_scores={"R": 1.0, "I": 3.0, "A": 1.0, "S": 2.0, "E": 4.0, "C": 6.5},
            prerequisites=["Commerce or any stream in 10+2"],
        ),
    ]


def test_rank_returns_between_three_and_five_options() -> None:
    results = rank_careers(make_student(), _career_set())
    assert 3 <= len(results) <= 5


def test_rank_caps_any_single_cluster_at_two_options() -> None:
    """A shortlist must offer genuinely different paths, not five near-synonyms."""
    results = rank_careers(make_student(), _career_set())
    clusters = [c.cluster for c in _career_set() if c.career_id in {r.career_id for r in results}]
    assert clusters.count("Data & AI") <= 2


def test_rank_is_stable_and_sorted_descending() -> None:
    student, careers = make_student(), _career_set()
    first = [r.career_id for r in rank_careers(student, careers)]
    for _ in range(10):
        assert [r.career_id for r in rank_careers(student, careers)] == first
    scores = [r.composite_score for r in rank_careers(student, careers)]
    assert scores == sorted(scores, reverse=True)


def test_rank_handles_an_empty_catalogue() -> None:
    assert rank_careers(make_student(), []) == []


def test_scoring_completes_within_the_500ms_target() -> None:
    """Story 2.1 engineering target: a full catalogue pass in under 500ms."""
    student = make_student()
    careers = [
        make_career(career_id=f"career-{i}", title=f"Career {i}", cluster=f"Cluster {i % 10}")
        for i in range(200)
    ]
    start = time.perf_counter()
    rank_careers(student, careers)
    assert (time.perf_counter() - start) < 0.5
