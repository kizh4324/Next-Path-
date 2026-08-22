"""Deterministic weighted-sum career scoring (FR-05, FR-06, FR-07).

Pure functions only: no database, no network, no ML, no randomness. The same profile
and the same catalogue always produce the same numbers, and every number that feeds
the composite is returned in `ScoreBreakdown` so a counselor can inspect and dispute
it. That inspectability is the reason this is a weighted sum rather than a model
(tech-stack.md §4).

Formulas, verbatim from docs/architecture/core-workflows.md §1.1:

    Fit       = 0.60·RIASEC_Alignment + 0.40·Aptitude_Signal_Match
    Feas      = 0.45·Budget_Compatibility + 0.35·Relocation_Fit + 0.20·Stage_Eligibility
    Evid      = 0.70·profile_completeness_pct + 0.30·(100 if records else 40)
    Composite = max(0, 0.55·Fit + 0.45·Feas − 0.10·(100 − Evid))
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

from app.schemas.enums import (
    RELOCATION_ORDER,
    RIASEC_KEYS,
    BudgetTier,
    EducationStage,
    EvidenceQualityLabel,
    FeasibilityLabel,
    FitLabel,
    RelocationWillingness,
)
from app.schemas.recommendation import ScoreBreakdown, ScoredCareerPreview

# --------------------------------------------------------------------------------------
# Weights (core-workflows.md §1.1). Named constants, not inline literals, so a change
# here is a reviewable diff and the unit tests can assert against them directly.
# --------------------------------------------------------------------------------------
W_FIT_RIASEC = 0.60
W_FIT_APTITUDE = 0.40

W_FEAS_BUDGET = 0.45
W_FEAS_RELOCATION = 0.35
W_FEAS_STAGE = 0.20

W_EVID_COMPLETENESS = 0.70
W_EVID_RECORDS = 0.30

W_COMPOSITE_FIT = 0.55
W_COMPOSITE_FEAS = 0.45
W_COMPOSITE_EVIDENCE_PENALTY = 0.10

RECORDS_WEIGHT_PRESENT = 100.0
RECORDS_WEIGHT_ABSENT = 40.0

# Feasibility sub-score constants (core-workflows.md §1.1 prose).
RELOCATION_FIT_WITHIN_BOUNDARY = 100.0
RELOCATION_FIT_BEYOND_BOUNDARY = 40.0
STAGE_ELIGIBILITY_DIRECT = 100.0
STAGE_ELIGIBILITY_BRIDGE_REQUIRED = 50.0
BUDGET_FULL_MATCH = 100.0
# A route above budget is not scored to zero when scholarships can realistically close
# the gap — PRD Section 13.3 treats funded routes as genuinely reachable.
BUDGET_SCHOLARSHIP_RELIEF = 25.0

MIN_OPTIONS = 3
MAX_OPTIONS = 5

# Annual affordability ceiling implied by each tier, in INR (data-models.md §2).
BUDGET_TIER_ANNUAL_CEILING_INR: dict[BudgetTier, int] = {
    BudgetTier.LOW_COST_ONLY: 50_000,
    BudgetTier.MODERATE_UP_TO_2L: 200_000,
    # Not unlimited — an explicit high ceiling keeps the arithmetic bounded and honest.
    BudgetTier.FLEXIBLE_ABOVE_2L: 1_000_000,
}

# Keyword -> aptitude domain. Version-controlled and inspectable; matched against
# authored prerequisite text and essential skill names. Deliberately not fuzzy.
APTITUDE_DOMAIN_KEYWORDS: dict[str, tuple[str, ...]] = {
    "mathematics": ("mathematic", "maths", "calculus", "algebra", "statistic", "quantitative"),
    "physics": ("physic", "mechanic", "electrical", "electronic", "thermodynamic"),
    "chemistry": ("chemistry", "chemical", "pharmacolog"),
    "biology": ("biolog", "botany", "zoolog", "anatomy", "physiolog", "medicine", "clinical"),
    "computers": ("comput", "programming", "software", "coding", "python", "sql", "data"),
    "language": ("english", "language", "writing", "communicat", "literature", "content"),
    "social_science": ("history", "civic", "polit", "sociolog", "psycholog", "law", "public"),
    "commerce": ("commerce", "account", "finance", "economic", "business", "audit", "tax"),
    "art_design": ("design", "art", "drawing", "visual", "aesthetic", "creative", "craft"),
    "practical_skills": ("workshop", "repair", "field", "hands-on", "technician", "operat"),
}

# Prerequisite text -> the 10+2 stream that satisfies it.
STREAM_KEYWORDS: dict[str, tuple[str, ...]] = {
    "science_maths": ("mathematics", "maths", "physics", "pcm"),
    "science_biology": ("biology", "pcb", "botany", "zoology"),
    "commerce": ("commerce", "accountancy", "business studies", "economics"),
    "arts": ("arts", "humanities", "history", "political science", "sociology"),
}


# --------------------------------------------------------------------------------------
# Inputs
# --------------------------------------------------------------------------------------
@dataclass(frozen=True)
class StudentScoringProfile:
    """Everything the engine needs about a student, already resolved from the DB."""

    education_stage: str
    current_stream: str | None
    # Derived from `interests` via `build_riasec_vector`; values are raw 1-5 strengths.
    riasec_vector: dict[str, float]
    aptitude_signals: dict[str, int]
    budget_tier: BudgetTier
    relocation_willingness: RelocationWillingness
    profile_completeness_pct: int
    academic_records_available: bool
    # Guardian constraints override the student's own answers where they are stricter
    # (PRD Section 11: the family's real ceiling is the operative one).
    guardian_financial_ceiling_inr: int | None = None
    guardian_relocation_restriction: RelocationWillingness | None = None

    @property
    def effective_relocation(self) -> RelocationWillingness:
        if self.guardian_relocation_restriction is None:
            return self.relocation_willingness
        student_rank = RELOCATION_ORDER[self.relocation_willingness]
        guardian_rank = RELOCATION_ORDER[self.guardian_relocation_restriction]
        return (
            self.relocation_willingness if student_rank <= guardian_rank
            else self.guardian_relocation_restriction
        )

    @property
    def effective_annual_budget_inr(self) -> int:
        tier_ceiling = BUDGET_TIER_ANNUAL_CEILING_INR[self.budget_tier]
        if self.guardian_financial_ceiling_inr is None:
            return tier_ceiling
        return min(tier_ceiling, self.guardian_financial_ceiling_inr)


@dataclass(frozen=True)
class CareerScoringInput:
    """A catalogue entry flattened into exactly what the engine reads."""

    career_id: str
    title: str
    cluster: str
    job_zone: int
    riasec_scores: dict[str, float]
    applicable_stages: list[str]
    entry_routes: list[dict[str, Any]]
    prerequisites: list[str]
    risks_and_tradeoffs: list[str]
    essential_skills: list[str] = field(default_factory=list)
    has_market_evidence: bool = False
    has_funded_route: bool = False


@dataclass(frozen=True)
class SubScore:
    """A sub-score plus the human-readable evidence for how it got there."""

    value: float
    reasons: list[str] = field(default_factory=list)
    concerns: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------
def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _round2(value: float) -> float:
    return round(value + 0.0, 2)


def build_riasec_vector(interests: list[dict[str, Any]]) -> dict[str, float]:
    """Collapse tagged interest entries into a 6-dimension Holland vector.

    Untagged interests contribute nothing to the vector — they are still recorded on
    the profile, but they cannot move a dimension they were never mapped to. That gap
    surfaces later as a missing-evidence flag rather than being silently filled in.
    """
    vector: dict[str, float] = dict.fromkeys(RIASEC_KEYS, 0.0)
    for entry in interests:
        raw_code = entry.get("riasec")
        if not isinstance(raw_code, str):
            continue
        code = raw_code.strip().upper()
        if code not in vector:
            continue
        strength = entry.get("strength", 3)
        vector[code] += float(strength) if isinstance(strength, int | float) else 3.0
    return vector


def _cosine_similarity(a: dict[str, float], b: dict[str, float]) -> float:
    """Cosine similarity over the RIASEC axes, in [0, 1] for non-negative vectors."""
    dot = sum(a.get(k, 0.0) * b.get(k, 0.0) for k in RIASEC_KEYS)
    norm_a = math.sqrt(sum(a.get(k, 0.0) ** 2 for k in RIASEC_KEYS))
    norm_b = math.sqrt(sum(b.get(k, 0.0) ** 2 for k in RIASEC_KEYS))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def derive_aptitude_domains(
    prerequisites: list[str],
    essential_skills: list[str],
) -> set[str]:
    """Map authored prerequisite/skill text onto aptitude domains by keyword.

    Exact substring matching against a version-controlled keyword table — no fuzzy
    matching, so the result is reproducible and reviewable.
    """
    haystack = " ".join([*prerequisites, *essential_skills]).lower()
    return {
        domain
        for domain, keywords in APTITUDE_DOMAIN_KEYWORDS.items()
        if any(keyword in haystack for keyword in keywords)
    }


def _required_streams(prerequisites: list[str]) -> set[str]:
    haystack = " ".join(prerequisites).lower()
    return {
        stream
        for stream, keywords in STREAM_KEYWORDS.items()
        if any(keyword in haystack for keyword in keywords)
    }


def _normalize_stream(stream: str | None) -> str | None:
    if not stream:
        return None
    lowered = stream.lower()
    for canonical, keywords in STREAM_KEYWORDS.items():
        if canonical.replace("_", " ") in lowered or any(k in lowered for k in keywords):
            return canonical
    return None


def _format_inr(amount: int) -> str:
    """Indian digit grouping: 2,50,000 rather than 250,000."""
    if amount < 1000:
        return f"₹{amount}"
    text = str(amount)
    last_three = text[-3:]
    rest = text[:-3]
    groups: list[str] = []
    while len(rest) > 2:
        groups.insert(0, rest[-2:])
        rest = rest[:-2]
    if rest:
        groups.insert(0, rest)
    return "₹" + ",".join([*groups, last_three])


# --------------------------------------------------------------------------------------
# Component scores
# --------------------------------------------------------------------------------------
def riasec_alignment(student: StudentScoringProfile, career: CareerScoringInput) -> SubScore:
    similarity = _cosine_similarity(student.riasec_vector, career.riasec_scores)
    value = _clamp(similarity * 100.0)

    reasons: list[str] = []
    concerns: list[str] = []

    if all(v == 0.0 for v in student.riasec_vector.values()):
        concerns.append(
            "None of your interests were matched to an interest type yet, so this "
            "match is based on your practical circumstances rather than what you enjoy."
        )
        return SubScore(0.0, reasons, concerns)

    top_student = max(student.riasec_vector, key=lambda k: student.riasec_vector[k])
    top_career = max(career.riasec_scores, key=lambda k: career.riasec_scores.get(k, 0.0))
    labels = {
        "R": "hands-on, practical work",
        "I": "investigating and analysing",
        "A": "creative and expressive work",
        "S": "helping and working with people",
        "E": "leading, persuading and organising",
        "C": "structured, detail-oriented work",
    }
    if value >= 70:
        reasons.append(
            f"Your strongest interest is {labels[top_student]}, which is also what this "
            f"role mostly involves."
        )
    elif value >= 45:
        reasons.append(
            f"There is partial overlap between your interest in {labels[top_student]} "
            f"and this role's focus on {labels[top_career]}."
        )
    else:
        concerns.append(
            f"This role centres on {labels[top_career]}, which is not where your "
            f"strongest interests currently point."
        )
    return SubScore(_round2(value), reasons, concerns)


def aptitude_signal_match(
    student: StudentScoringProfile, career: CareerScoringInput
) -> SubScore:
    """Overlap between self-reported strengths and the career's knowledge domains."""
    career_domains = derive_aptitude_domains(career.prerequisites, career.essential_skills)
    reasons: list[str] = []
    concerns: list[str] = []

    if not career_domains:
        # No domain could be derived from the authored content. Score neutrally rather
        # than penalising the career for a gap in our own catalogue.
        return SubScore(50.0, reasons, ["We have limited subject data for this role."])
    if not student.aptitude_signals:
        concerns.append("You have not rated your subject strengths yet.")
        return SubScore(0.0, reasons, concerns)

    # Mean of the student's self-ratings across the domains this career needs, on 1-5,
    # rescaled so 1 -> 0 and 5 -> 100. A domain the student never rated counts as
    # unrated (contributing 0), not as a weakness they claimed.
    matched: list[tuple[str, int]] = []
    unrated: list[str] = []
    for domain in sorted(career_domains):
        rating = student.aptitude_signals.get(domain)
        if isinstance(rating, int) and 1 <= rating <= 5:
            matched.append((domain, rating))
        else:
            unrated.append(domain)

    if not matched:
        concerns.append(
            "You have not rated the subjects this role depends on "
            f"({', '.join(d.replace('_', ' ') for d in unrated)})."
        )
        return SubScore(0.0, reasons, concerns)

    total = sum((rating - 1) / 4.0 * 100.0 for _, rating in matched)
    # Unrated required domains dilute the average — absence of evidence is not evidence
    # of strength.
    value = _clamp(total / (len(matched) + len(unrated)))

    strong = [d for d, r in matched if r >= 4]
    weak = [d for d, r in matched if r <= 2]
    if strong:
        reasons.append(
            "You rated yourself strong in "
            f"{', '.join(d.replace('_', ' ') for d in strong)}, which this role uses daily."
        )
    if weak:
        concerns.append(
            "You rated yourself weaker in "
            f"{', '.join(d.replace('_', ' ') for d in weak)}, which this role leans on."
        )
    if unrated:
        concerns.append(
            "No self-rating yet for "
            f"{', '.join(d.replace('_', ' ') for d in unrated)}."
        )
    return SubScore(_round2(value), reasons, concerns)


def budget_compatibility(student: StudentScoringProfile, career: CareerScoringInput) -> SubScore:
    """Score the cheapest viable route against the family's real annual ceiling."""
    reasons: list[str] = []
    concerns: list[str] = []

    if not career.entry_routes:
        return SubScore(50.0, reasons, ["No entry route cost data is recorded for this role."])

    ceiling = student.effective_annual_budget_inr
    best_value = 0.0
    best_route: dict[str, Any] | None = None

    for route in career.entry_routes:
        duration = max(1, int(route.get("duration_years", 1) or 1))
        cost_max = int(route.get("estimated_cost_inr_max", 0) or 0)
        annual_cost = cost_max / duration

        if annual_cost <= ceiling:
            value = BUDGET_FULL_MATCH
        else:
            # Proportional penalty: at twice the ceiling the route scores 50, at four
            # times it scores 25. Never a hard zero — a stretch is not an impossibility.
            value = _clamp(BUDGET_FULL_MATCH * ceiling / annual_cost)
            if career.has_funded_route or route.get("low_cost_alternative_route"):
                value = _clamp(value + BUDGET_SCHOLARSHIP_RELIEF)

        if value > best_value:
            best_value = value
            best_route = route

    if best_route is not None:
        name = best_route.get("route_name", "this route")
        cost_min = int(best_route.get("estimated_cost_inr_min", 0) or 0)
        cost_max = int(best_route.get("estimated_cost_inr_max", 0) or 0)
        if best_value >= BUDGET_FULL_MATCH:
            reasons.append(
                f"{name} costs about {_format_inr(cost_min)}–{_format_inr(cost_max)} in "
                f"total, which fits the budget you described."
            )
        else:
            concerns.append(
                f"The cheapest route we have ({name}) costs about "
                f"{_format_inr(cost_min)}–{_format_inr(cost_max)} in total, above the "
                f"budget you described."
            )
            alternative = best_route.get("low_cost_alternative_route")
            if alternative:
                reasons.append(f"A lower-cost path exists: {alternative}.")

    return SubScore(_round2(best_value), reasons, concerns)


def relocation_fit(student: StudentScoringProfile, career: CareerScoringInput) -> SubScore:
    """100 when a route is reachable inside the student's boundary, 40 when not."""
    reasons: list[str] = []
    concerns: list[str] = []

    allowed_rank = RELOCATION_ORDER[student.effective_relocation]
    scopes: list[RelocationWillingness] = []
    for route in career.entry_routes:
        raw_scope = route.get("availability_scope")
        if isinstance(raw_scope, str):
            try:
                scopes.append(RelocationWillingness(raw_scope))
            except ValueError:
                continue

    if not scopes:
        return SubScore(
            50.0, reasons, ["We do not have location availability data for this route yet."]
        )

    nearest = min(scopes, key=lambda s: RELOCATION_ORDER[s])
    if RELOCATION_ORDER[nearest] <= allowed_rank:
        reasons.append("Entry routes for this role are available within the area you can study in.")
        return SubScore(RELOCATION_FIT_WITHIN_BOUNDARY, reasons, concerns)

    readable = {
        RelocationWillingness.HOME_DISTRICT_ONLY: "your home district",
        RelocationWillingness.WITHIN_STATE: "your state",
        RelocationWillingness.ANYWHERE_IN_INDIA: "India",
        RelocationWillingness.ABROAD: "abroad",
    }
    concerns.append(
        f"The nearest entry route requires studying beyond {readable[student.effective_relocation]} "
        f"— realistically {readable[nearest]}."
    )
    if student.guardian_relocation_restriction is not None and (
        student.effective_relocation == student.guardian_relocation_restriction
        and student.guardian_relocation_restriction != student.relocation_willingness
    ):
        concerns.append(
            "Your guardian set a tighter limit on how far you can move than you did. "
            "This is worth discussing together."
        )
    return SubScore(RELOCATION_FIT_BEYOND_BOUNDARY, reasons, concerns)


def stage_eligibility(student: StudentScoringProfile, career: CareerScoringInput) -> SubScore:
    """100 when stage and stream already satisfy prerequisites, 50 when a bridge is needed."""
    reasons: list[str] = []
    concerns: list[str] = []

    if career.applicable_stages and student.education_stage not in career.applicable_stages:
        concerns.append(
            "This path is usually decided at a different stage of school than the one "
            "you are in now."
        )
        return SubScore(STAGE_ELIGIBILITY_BRIDGE_REQUIRED, reasons, concerns)

    required = _required_streams(career.prerequisites)
    if not required:
        reasons.append("No specific school stream is required to start this path.")
        return SubScore(STAGE_ELIGIBILITY_DIRECT, reasons, concerns)

    # A Class 8-10 student has not chosen a stream yet, so a stream requirement is
    # information about the choice ahead, not a disqualification.
    if student.education_stage == EducationStage.CLASS_8_10.value:
        reasons.append(
            "You would need to choose "
            f"{', or '.join(s.replace('_', ' ') for s in sorted(required))} "
            "when you pick your stream."
        )
        return SubScore(STAGE_ELIGIBILITY_DIRECT, reasons, concerns)

    current = _normalize_stream(student.current_stream)
    if current is None:
        concerns.append("You have not told us which stream you are studying.")
        return SubScore(STAGE_ELIGIBILITY_BRIDGE_REQUIRED, reasons, concerns)
    if current in required:
        reasons.append(f"Your current stream ({student.current_stream}) already qualifies you.")
        return SubScore(STAGE_ELIGIBILITY_DIRECT, reasons, concerns)

    concerns.append(
        f"This path normally expects {', or '.join(s.replace('_', ' ') for s in sorted(required))}, "
        f"while you are in {student.current_stream}. A bridge or entrance route would be needed."
    )
    return SubScore(STAGE_ELIGIBILITY_BRIDGE_REQUIRED, reasons, concerns)


def evidence_quality(student: StudentScoringProfile) -> tuple[float, float]:
    """Return (score, records_weight). Career-independent — it measures our data on you."""
    records_weight = (
        RECORDS_WEIGHT_PRESENT if student.academic_records_available else RECORDS_WEIGHT_ABSENT
    )
    score = (
        W_EVID_COMPLETENESS * float(student.profile_completeness_pct)
        + W_EVID_RECORDS * records_weight
    )
    return _round2(_clamp(score)), records_weight


# --------------------------------------------------------------------------------------
# Label assignment (core-workflows.md §1.2)
# --------------------------------------------------------------------------------------
def assign_fit_label(score: float) -> FitLabel:
    if score >= 75.0:
        return FitLabel.STRONG
    if score >= 55.0:
        return FitLabel.MODERATE
    if score >= 35.0:
        return FitLabel.EMERGING
    return FitLabel.INSUFFICIENT_EVIDENCE


def assign_feasibility_label(score: float) -> FeasibilityLabel:
    if score >= 75.0:
        return FeasibilityLabel.HIGH
    if score >= 50.0:
        return FeasibilityLabel.MODERATE
    if score >= 30.0:
        return FeasibilityLabel.CHALLENGING
    return FeasibilityLabel.LOW


def assign_evidence_label(score: float) -> EvidenceQualityLabel:
    if score >= 80.0:
        return EvidenceQualityLabel.HIGH
    if score >= 50.0:
        return EvidenceQualityLabel.MODERATE
    if score >= 30.0:
        return EvidenceQualityLabel.PRELIMINARY
    return EvidenceQualityLabel.SPARSE


# --------------------------------------------------------------------------------------
# Missing-evidence flags (FR-06)
# --------------------------------------------------------------------------------------
def collect_missing_evidence(
    student: StudentScoringProfile, career: CareerScoringInput
) -> list[str]:
    """Name what we do not know, so a thin result is never mistaken for a confident one."""
    flags: list[str] = []

    if all(v == 0.0 for v in student.riasec_vector.values()):
        flags.append("No interests have been mapped to an interest type yet.")
    if not student.aptitude_signals:
        flags.append("No subject strengths have been rated.")
    if not student.academic_records_available:
        flags.append("Academic records were not shared, so subject evidence is self-reported only.")
    if student.profile_completeness_pct < 70:
        flags.append(
            f"Your profile is {student.profile_completeness_pct}% complete — "
            "finishing it will sharpen this result."
        )
    if not career.has_market_evidence:
        # Honest by design: the Naukri sample covers data roles only (NOTICE.md).
        flags.append(
            "We have no dated job-market evidence for this role, so demand and salary "
            "figures are not shown."
        )
    if student.current_stream is None and student.education_stage != EducationStage.CLASS_8_10.value:
        flags.append("Your current stream is not recorded.")
    return flags


# --------------------------------------------------------------------------------------
# Composite
# --------------------------------------------------------------------------------------
def score_career(
    student: StudentScoringProfile, career: CareerScoringInput
) -> ScoredCareerPreview:
    """Score one career and return every contributing number plus its rationale."""
    riasec = riasec_alignment(student, career)
    aptitude = aptitude_signal_match(student, career)
    budget = budget_compatibility(student, career)
    relocation = relocation_fit(student, career)
    stage = stage_eligibility(student, career)
    evid_score, records_weight = evidence_quality(student)

    fit = _clamp(W_FIT_RIASEC * riasec.value + W_FIT_APTITUDE * aptitude.value)
    feasibility = _clamp(
        W_FEAS_BUDGET * budget.value
        + W_FEAS_RELOCATION * relocation.value
        + W_FEAS_STAGE * stage.value
    )
    evidence_penalty = W_COMPOSITE_EVIDENCE_PENALTY * (100.0 - evid_score)
    composite = max(
        0.0,
        W_COMPOSITE_FIT * fit + W_COMPOSITE_FEAS * feasibility - evidence_penalty,
    )

    reasons: list[str] = []
    concerns: list[str] = []
    for sub in (riasec, aptitude, budget, relocation, stage):
        reasons.extend(sub.reasons)
        concerns.extend(sub.concerns)

    # Authored risks always travel with the recommendation — a student should see the
    # downside of a path at the same moment they see it recommended (FR-06).
    concerns.extend(career.risks_and_tradeoffs)

    return ScoredCareerPreview(
        career_id=career.career_id,
        career_title=career.title,
        composite_score=_round2(_clamp(composite)),
        fit_score=_round2(fit),
        feasibility_score=_round2(feasibility),
        evidence_quality_score=evid_score,
        fit_label=assign_fit_label(fit),
        feasibility_label=assign_feasibility_label(feasibility),
        evidence_quality_label=assign_evidence_label(evid_score),
        reasons=reasons,
        concerns=concerns,
        missing_evidence_flags=collect_missing_evidence(student, career),
        breakdown=ScoreBreakdown(
            riasec_alignment=riasec.value,
            aptitude_signal_match=aptitude.value,
            budget_compatibility=budget.value,
            relocation_fit=relocation.value,
            stage_eligibility=stage.value,
            profile_completeness_pct=float(student.profile_completeness_pct),
            records_weight=records_weight,
            evidence_penalty=_round2(evidence_penalty),
        ),
    )


def rank_careers(
    student: StudentScoringProfile,
    careers: list[CareerScoringInput],
    max_options: int = MAX_OPTIONS,
) -> list[ScoredCareerPreview]:
    """Score every career and return the top 3-5 (FR-05).

    Ties break on career_id so repeated runs over unchanged data return an identical
    ordering — a student must not see their ranking reshuffle for no reason.

    Diversity rule: at most two options from any one cluster, so a shortlist cannot
    collapse into five variations of the same job. PRD Section 1.2 requires options
    that are genuinely different from each other, not a ranked list of near-synonyms.
    """
    if not careers:
        return []

    scored = sorted(
        (score_career(student, career) for career in careers),
        key=lambda s: (-s.composite_score, s.career_id),
    )
    cluster_by_id = {career.career_id: career.cluster for career in careers}

    selected: list[ScoredCareerPreview] = []
    per_cluster: dict[str, int] = {}
    overflow: list[ScoredCareerPreview] = []

    for candidate in scored:
        cluster = cluster_by_id.get(candidate.career_id, "")
        if per_cluster.get(cluster, 0) >= 2:
            overflow.append(candidate)
            continue
        selected.append(candidate)
        per_cluster[cluster] = per_cluster.get(cluster, 0) + 1
        if len(selected) == max_options:
            break

    # Backfill from overflow only to reach the floor of 3 (FR-05). Beyond that the
    # diversity cap wins: a fourth same-cluster option is worth less to a student than
    # three genuinely different ones.
    for candidate in overflow:
        if len(selected) >= MIN_OPTIONS:
            break
        selected.append(candidate)

    # Re-sort after backfill so the returned order is always strictly descending.
    selected.sort(key=lambda s: (-s.composite_score, s.career_id))
    return selected[:max_options]
