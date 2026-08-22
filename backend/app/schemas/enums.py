"""Enumerated types shared across schemas, models, and the scoring engine.

Mirrors docs/architecture/data-models.md §2 exactly. The string values are also the
values stored in the database CHECK constraints — changing one without the other
breaks writes at the DB layer, not at validation.
"""

from __future__ import annotations

from enum import Enum


class EducationStage(str, Enum):
    CLASS_8_10 = "class_8_10"
    CLASS_11_12 = "class_11_12"
    EARLY_COLLEGE = "early_college"


class UserRole(str, Enum):
    STUDENT = "student"
    GUARDIAN = "guardian"
    COUNSELOR = "counselor"
    ADMIN = "admin"


class ConsentType(str, Enum):
    # Required for Class 8-10 and Class 11-12.
    GUARDIAN_CONSENT_MINOR = "guardian_consent_minor"
    # Permitted only for Early College students aged 18+.
    SELF_CONSENT_ADULT = "self_consent_adult"


class BudgetTier(str, Enum):
    LOW_COST_ONLY = "low_cost_only"                # < INR 50,000 / yr
    MODERATE_UP_TO_2L = "moderate_up_to_2_lakhs"   # INR 50,000 - 2,00,000 / yr
    FLEXIBLE_ABOVE_2L = "flexible_above_2_lakhs"   # > INR 2,00,000 / yr


class RelocationWillingness(str, Enum):
    HOME_DISTRICT_ONLY = "home_district_only"
    WITHIN_STATE = "within_state"
    ANYWHERE_IN_INDIA = "anywhere_in_india"
    ABROAD = "abroad"


class FitLabel(str, Enum):
    STRONG = "Strong"
    MODERATE = "Moderate"
    EMERGING = "Emerging"
    INSUFFICIENT_EVIDENCE = "Insufficient evidence"


class FeasibilityLabel(str, Enum):
    HIGH = "High"
    MODERATE = "Moderate"
    CHALLENGING = "Challenging"
    LOW = "Low"


class EvidenceQualityLabel(str, Enum):
    HIGH = "High"
    MODERATE = "Moderate"
    PRELIMINARY = "Preliminary"
    SPARSE = "Sparse"


class SkillCategory(str, Enum):
    ESSENTIAL = "essential"
    USEFUL = "useful"
    OPTIONAL = "optional"


class SponsorType(str, Enum):
    GOVERNMENT = "Government"
    PRIVATE = "Private"
    INSTITUTIONAL = "Institutional"


class DemandIndicator(str, Enum):
    HIGH = "High"
    MODERATE = "Moderate"
    EMERGING = "Emerging"
    STABLE = "Stable"
    NICHE = "Niche"


class TimeframeBucket(str, Enum):
    NEXT_7_DAYS = "next_7_days"
    DAY_30 = "day_30"
    DAY_90 = "day_90"
    DAY_180 = "day_180"


class MilestoneType(str, Enum):
    EXPLORATION = "exploration"
    FOUNDATIONAL_LEARNING = "foundational_learning"
    SKILL_CHECK = "skill_check"
    EXAM_PREP = "exam_prep"
    PROJECT_OUTPUT = "project_output"
    SCHOLARSHIP_APPLICATION = "scholarship_application"
    REASSESSMENT = "reassessment"


class EvidenceType(str, Enum):
    SELF_REPORT = "self_report"
    PROJECT_ARTIFACT = "project_artifact"
    QUIZ_SCORE = "quiz_score"
    MENTOR_CONFIRMATION = "mentor_confirmation"


class RoadmapStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    REASSESSING = "reassessing"


class EscalationTrigger(str, Enum):
    HIGH_STAKES_CHOICE = "high_stakes_choice"
    SEVERE_CONSTRAINT_CONFLICT = "severe_constraint_conflict"
    STUDENT_PARENT_DEADLOCK = "student_parent_deadlock"
    LOW_EVIDENCE_PROFILE = "low_evidence_profile"
    STUDENT_REQUESTED = "student_requested"
    CRISIS_SAFETY_FLAG = "crisis_safety_flag"


class EscalationStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    SESSION_SCHEDULED = "session_scheduled"
    RESOLVED = "resolved"
    OVERRIDDEN = "overridden"


class RiasecDimension(str, Enum):
    REALISTIC = "R"
    INVESTIGATIVE = "I"
    ARTISTIC = "A"
    SOCIAL = "S"
    ENTERPRISING = "E"
    CONVENTIONAL = "C"


RIASEC_KEYS: tuple[str, ...] = ("R", "I", "A", "S", "E", "C")

# Ordered weakest -> strongest. Used to compare a student's ceiling against a route's
# cost tier without hardcoding the comparison at each call site.
BUDGET_TIER_ORDER: dict[BudgetTier, int] = {
    BudgetTier.LOW_COST_ONLY: 0,
    BudgetTier.MODERATE_UP_TO_2L: 1,
    BudgetTier.FLEXIBLE_ABOVE_2L: 2,
}

RELOCATION_ORDER: dict[RelocationWillingness, int] = {
    RelocationWillingness.HOME_DISTRICT_ONLY: 0,
    RelocationWillingness.WITHIN_STATE: 1,
    RelocationWillingness.ANYWHERE_IN_INDIA: 2,
    RelocationWillingness.ABROAD: 3,
}
