# System Architecture: Data Models

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/data-models.md`  
**Status:** Approved Architectural Baseline  
**Source of truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Companion shards:** 
- `docs/architecture/tech-stack.md`
- `docs/architecture/database-schema.md`
- `docs/architecture/api-specification.md`
- `docs/architecture/coding-standards.md`

---

## 1. Data Modeling Principles & Governance Mandate

All domain models are implemented as strict **Pydantic v2.9.x** models on the backend and paired with matching **TypeScript 5.6.x** / **Zod 3.23.x** schemas on the frontend.

### Core Modeling Principles:
1. **Mandatory Governance Metadata (PRD Section 13):** Every data model dealing with careers, market data, learning resources, and scholarships MUST enforce governance fields (source links, last verified date, content owner, official links, eligibility rules) as **required non-optional attributes**.
2. **Explainability Over Opaque Weights (FR-06, FR-07):** Recommendation data models explicitly persist decomposed scores (`fit_score`, `feasibility_score`, `evidence_quality_score`), itemized reasons, specific concerns, and missing evidence flags.
3. **Stage-Aware Validation & Minor Consent (FR-01, FR-02, FR-20):** Profile structures dynamically branch based on the user's educational stage (`class_8_10`, `class_11_12`, `early_college`) and strictly capture minor consent records (`consent_given_by`, `consent_recorded_at`). Marks are never mandatory.
4. **Historical Preservation via Recommendation Batches (FR-18):** Reassessment cycles create a new `RecommendationBatch` that groups the 3–5 `Recommendation` options and the generated `ParentSummary`. Superseded batches and individual recommendations are preserved via `is_current = False` and `superseded_at = timestamp`.
5. **Auditable LLM Grounding & Summary Persistence (FR-16, FR-17):** Chat interactions are logged with exact injected career IDs (`ChatInteraction`), and parent summaries (`ParentSummary`) are persisted per generation rather than recomputed on the fly.
6. **Seed Dataset Grounding:** Model structures are strictly mapped from the verified seed datasets:
   - `Scholarship` ← Scholar-Spot Indian scholarships CSV (`ID`, `State`, `Name`, `Category`, `Income `, `Qualification`, `Description`, `LINKS`, `Type`)
   - `MarketSnapshot` ← Naukri India Job Postings dataset (`Job_Titles`, `Company_Names`, `Experience_Required`, `Package_Details`, `Locations`, `Skills`, `Post_Url`, `Post_Time`)
   - `CareerLibrary` & `CareerSkill` ← O*NET v30.3 content taxonomy with normalized importance scores and India-specific entry routes.

---

## 2. Enumerated Types & Value Objects

```python
from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, HttpUrl, EmailStr

class EducationStage(str, Enum):
    CLASS_8_10 = "class_8_10"
    CLASS_11_12 = "class_11_12"
    EARLY_COLLEGE = "early_college"

class ConsentType(str, Enum):
    GUARDIAN_CONSENT_MINOR = "guardian_consent_minor"  # Required for Class 8-10 and Class 11-12
    SELF_CONSENT_ADULT = "self_consent_adult"          # Permitted only for Early College >= 18 yrs

class BudgetTier(str, Enum):
    LOW_COST_ONLY = "low_cost_only"              # < INR 50,000 / yr (Public / Scholarship reliant)
    MODERATE_UP_TO_2L = "moderate_up_to_2_lakhs" # INR 50,000 - 2,00,000 / yr
    FLEXIBLE_ABOVE_2L = "flexible_above_2_lakhs" # > INR 2,00,000 / yr

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
```

---

## 3. Entity Models

### 3.1 Student Profile (`StudentProfile`) — Traces to FR-01, FR-02, FR-20
Captures student self-discovery, academic stage, interests, and constraints, along with mandatory minor consent tracking. Marks are strictly optional per FR-02.

```python
class StudentProfile(BaseModel):
    id: str = Field(description="Unique UUID for student profile")
    user_id: str = Field(description="Foreign key to auth user")
    education_stage: EducationStage = Field(description="Current educational milestone")
    grade_or_year: str = Field(description="e.g. 'Class 10', 'Class 12', 'B.Tech 1st Year'")
    current_stream: Optional[str] = Field(None, description="e.g. 'Science PCM', 'Commerce', 'Arts', None for Class 8-10")
    
    # Self-discovery & preferences (FR-02)
    interests: List[str] = Field(default_factory=list, description="Self-reported interest tags & RIASEC keywords")
    aptitude_signals: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Self-reported strengths, favorite subjects, non-mandatory academic bands"
    )
    work_style_preferences: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Preferences e.g. teamwork vs independent, practical vs theoretical"
    )
    
    # Practical constraints (FR-02, FR-07)
    budget_tier: BudgetTier = Field(default=BudgetTier.MODERATE_UP_TO_2L)
    relocation_willingness: RelocationWillingness = Field(default=RelocationWillingness.WITHIN_STATE)
    preferred_languages: List[str] = Field(default_factory=lambda: ["English", "Hindi"])
    
    # Minor Consent & Governance (FR-20 - Mandatory)
    consent_type: ConsentType = Field(description="guardian_consent_minor or self_consent_adult")
    consent_given_by: Optional[str] = Field(
        None, 
        description="Foreign key referencing guardian user_id. Nullable ONLY if student is verified adult (early_college)."
    )
    consent_recorded_at: datetime = Field(default_factory=datetime.utcnow, description="Immutable consent timestamp")
    
    # Meta / Quality metrics (FR-07)
    academic_records_available: bool = Field(default=False, description="Flag indicating if formal marks were provided")
    profile_completeness_pct: int = Field(default=0, ge=0, le=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### 3.2 Guardian Context (`GuardianContext`) — Traces to FR-03, FR-17
Captures parent or guardian priorities, budget constraints, and relocation restrictions separately to detect alignment or conflict without overriding student agency.

```python
class GuardianContext(BaseModel):
    id: str = Field(description="Unique UUID for guardian context")
    student_id: str = Field(description="Foreign key to student profile")
    guardian_name: Optional[str] = None
    relationship_to_student: str = Field(description="e.g. 'Mother', 'Father', 'Guardian'")
    
    # Priorities & constraints (FR-03)
    guardian_priorities: List[str] = Field(
        default_factory=list, 
        description="Ranked priorities: ['Financial Stability', 'Proximity to Home', 'Government Job Security']"
    )
    financial_ceiling_inr: Optional[int] = Field(
        None, 
        description="Maximum annual budget in INR the family can comfortably support"
    )
    relocation_restriction: RelocationWillingness = Field(
        default=RelocationWillingness.WITHIN_STATE,
        description="Guardian-imposed geographic boundary"
    )
    notes_and_concerns: Optional[str] = Field(None, description="Open text regarding concerns or expectations")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### 3.3 Career Library (`CareerLibrary`) — Traces to FR-04, PRD 13.1
Localized occupational catalogue seeded from O*NET taxonomy and enhanced with Indian educational pathways, entrance exams, and cost structures.

```python
class IndiaEntryRoute(BaseModel):
    route_name: str = Field(description="e.g. 'Standard B.Tech Engineering Pathway'")
    duration_years: int = Field(description="Typical years required to qualify")
    entrance_exams: List[str] = Field(description="e.g. ['JEE Main', 'MHT-CET', 'CUET']")
    cost_tier: BudgetTier = Field(description="Cost classification of this route")
    estimated_cost_inr_min: int = Field(description="Minimum estimated total cost in INR")
    estimated_cost_inr_max: int = Field(description="Maximum estimated total cost in INR")
    degree_or_cert_awarded: str = Field(description="e.g. 'B.Tech / B.E. in Computer Science'")
    low_cost_alternative_route: Optional[str] = Field(
        None, 
        description="e.g. 'Government Polytechnic Diploma followed by Lateral Entry B.Tech'"
    )

class CareerLibrary(BaseModel):
    id: str = Field(description="Unique slug identifier (e.g. 'data-scientist', 'clinical-psychologist')")
    onet_soc_code: str = Field(description="O*NET-SOC reference code, e.g. '15-2051.00'")
    title: str = Field(description="Canonical occupational title")
    cluster: str = Field(description="Domain cluster (e.g. 'Data & AI', 'Healthcare', 'Public Policy')")
    description: str = Field(description="Comprehensive standard overview")
    work_reality_summary: str = Field(description="Grounded description of daily tasks, stress factors, and work context")
    
    # Classification & Attributes
    applicable_stages: List[EducationStage] = Field(description="Relevant student stages")
    job_zone: int = Field(ge=1, le=5, description="O*NET Job Zone (1=Little prep to 5=Extensive postgrad prep)")
    riasec_code: str = Field(description="Top Holland code combination, e.g. 'IRC'")
    riasec_scores: Dict[str, float] = Field(description="RIASEC scores: {'R': 1.2, 'I': 6.8, 'A': 2.1, 'S': 3.5, 'E': 4.2, 'C': 4.9}")
    
    # India Localization (FR-04)
    india_entry_routes: List[IndiaEntryRoute] = Field(description="Structured Indian education & credential pathways")
    prerequisites: List[str] = Field(description="Mandatory 10th/12th subject requirements (e.g. 'Mathematics in 10+2')")
    risks_and_tradeoffs: List[str] = Field(description="Known risks, high drop-out rates, market saturation caveats")
    regional_caveats: Optional[str] = Field(None, description="Demand variations between Tier-1 tech hubs and other regions")
    
    # Mandatory Governance Metadata (PRD Section 13.1 - Non-Optional)
    content_owner: str = Field(description="Named SME / Counselor responsible for this record")
    review_cycle_months: int = Field(default=12, description="Mandatory review cycle in months")
    last_reviewed_date: date = Field(description="Date of latest editorial & factual verification")
    source_links: List[str] = Field(description="Official curriculum, regulatory, or research source URLs")
```

---

### 3.4 Career Skills & Free-First Learning (`CareerSkill`) — Traces to FR-11, FR-12, PRD 13.3
Breakdown of essential, useful, and optional skills with normalized scores and mandatory free learning alternatives.

```python
class CareerSkill(BaseModel):
    id: str = Field(description="Unique UUID for skill entity")
    career_id: str = Field(description="Foreign key / slug referencing CareerLibrary")
    skill_name: str = Field(description="e.g. 'Python Programming', 'Statistical Inference', 'User Empathy'")
    category: SkillCategory = Field(description="Essential, Useful, or Optional per FR-11")
    description: str = Field(description="Contextual explanation of how this skill applies in the role")
    
    # Free-First Resource Governance (FR-12, PRD 13.3 - Non-Optional)
    free_learning_resource_name: str = Field(description="e.g. 'NPTEL Python for Data Science (IIT Madras)'")
    free_learning_resource_url: str = Field(description="Direct URL to free public learning content")
    paid_learning_resource_name: Optional[str] = Field(None, description="Paid alternative (if any)")
    paid_learning_resource_url: Optional[str] = Field(None, description="URL to paid resource")
    commercial_disclosure: str = Field(
        default="Independent curated resource. No commercial commission or affiliation.",
        description="Mandatory conflict-of-interest disclosure per PRD 13.3"
    )
```

---

### 3.5 Scholarships (`Scholarship`) — Traces to FR-13, PRD 13.4
Seeded directly from the **Scholar-Spot Indian Scholarships Dataset** (`dataset.csv`). All governance fields are strictly non-optional.

```python
class Scholarship(BaseModel):
    id: int = Field(description="Primary key / ID from Scholar-Spot seed dataset")
    name: str = Field(description="Official name of the scholarship scheme (mapped from Name)")
    state: str = Field(description="State jurisdiction or 'All India' / 'Maharashtra' (mapped from State)")
    sponsor_type: SponsorType = Field(description="Government or Private (mapped from Type)")
    target_category: str = Field(description="Caste / Social category: 'all', 'SC', 'ST', 'SEBC', 'EBC', 'open' (mapped from Category)")
    income_ceiling_inr: int = Field(description="Annual family income ceiling in INR; 0 indicates no limit (mapped from Income)")
    min_qualification: str = Field(description="Target qualification: 'FYJC', 'HSC', 'Graduation', 'Medical', 'SSC' (mapped from Qualification)")
    amount_description: str = Field(description="Allowance details, fee reimbursement, maintenance amounts (mapped from Description)")
    
    # Mandatory Governance Fields (PRD Section 13.4 - Non-Optional)
    eligibility_summary: str = Field(description="Clear distilled eligibility rules")
    deadline_description: str = Field(description="Application cycle deadline e.g. 'Annual MahaDBT cycle (typically October-December)'")
    required_documents: List[str] = Field(
        default_factory=lambda: ["Income Certificate", "Caste Certificate (if applicable)", "Domicile Certificate", "Mark Sheet", "Aadhaar Card"],
        description="Checklist of mandatory documentation"
    )
    official_source_url: str = Field(description="Official portal link e.g. 'https://mahadbt.maharashtra.gov.in/' (mapped from LINKS)")
    last_verified_date: date = Field(description="Date official portal was verified (e.g. 2026-08-20)")
    renewal_conditions: Optional[str] = Field("Satisfactory academic progress in subsequent years", description="Renewal requirements")
    is_active: bool = Field(default=True, description="Flag indicating if the scheme is currently active")
```

---

### 3.6 Market Snapshots (`MarketSnapshot`) — Traces to FR-14, PRD 13.2
Seeded and synthesized from the **Naukri India Job Postings Dataset**. Enforces explicit uncertainty and caveats.

```python
class MarketSnapshot(BaseModel):
    id: str = Field(description="Unique UUID for market snapshot")
    career_id: str = Field(description="Foreign key referencing CareerLibrary.id")
    geography: str = Field(description="Regional scope e.g. 'India - Major Tech Hubs (Bengaluru, Pune, Hyderabad, Gurgaon, Mumbai)'")
    timeframe_period: str = Field(description="e.g. 'Sample of 47,193 Naukri job postings (2025-2026)'")
    data_source: str = Field(default="Naukri India Job Postings Sample", description="Dataset attribution")
    demand_indicator: DemandIndicator = Field(description="Categorical demand indicator")
    
    # Compensation benchmarks in INR
    salary_range_entry_inr: str = Field(description="e.g. '₹4,00,000 - ₹7,50,000 / annum'")
    salary_range_mid_inr: str = Field(description="e.g. '₹10,00,000 - ₹20,00,000 / annum'")
    
    # Skill & Hiring Distribution (derived from Naukri skills & locations)
    top_demanded_skills: List[str] = Field(description="Top skills extracted from postings: ['Python', 'SQL', 'Machine Learning', 'Data Mining']")
    top_hiring_locations: List[str] = Field(description="Top locations: ['Bengaluru', 'Gurgaon/Gurugram', 'Pune', 'Mumbai', 'Hyderabad']")
    experience_distribution: Dict[str, str] = Field(
        description="Distribution breakdown: {'0-2 Yrs (Entry)': '28%', '3-7 Yrs (Mid)': '54%', '8+ Yrs (Senior)': '18%'}"
    )
    
    # Mandatory Governance & Caveats (PRD Section 13.2 - Non-Optional)
    competition_caveat: str = Field(
        description="Mandatory caveat: 'Entry-level competition is fierce; generic degrees without demonstrated project evidence face lower shortlisting rates.'"
    )
    uncertainty_statement: str = Field(
        description="Mandatory statement: 'Job market trends reflect recent posting volume and do not guarantee future hiring demand.'"
    )
    last_updated_date: date = Field(description="Date snapshot was generated")
```

---

### 3.7 Recommendation Batches & Recommendations (`RecommendationBatch`, `Recommendation`) — Traces to FR-05, FR-06, FR-07, FR-09, FR-18
Decomposed, inspectable recommendation output generated by the deterministic weighted-scoring engine, grouped by batch to preserve reassessment history.

```python
class RecommendationBatch(BaseModel):
    id: str = Field(description="Unique UUID for recommendation batch")
    student_id: str = Field(description="Foreign key referencing StudentProfile.id")
    batch_number: int = Field(default=1, ge=1, description="1 for onboarding, 2+ for reassessment cycles")
    is_current: bool = Field(default=True, description="True if active batch; False if superseded by newer assessment")
    superseded_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Recommendation(BaseModel):
    id: str = Field(description="Unique UUID for recommendation entry")
    batch_id: str = Field(description="Foreign key referencing RecommendationBatch.id")
    student_id: str = Field(description="Foreign key referencing StudentProfile.id")
    career_id: str = Field(description="Foreign key referencing CareerLibrary.id")
    career_title: str = Field(description="Display title for quick serialization")
    rank_position: int = Field(ge=1, le=5, description="Rank position (1 to 5) in shortlist")
    
    # Decomposed Scores (Inspectable floats 0.0 - 100.0)
    composite_score: float = Field(ge=0.0, le=100.0, description="Overall weighted score")
    fit_score: float = Field(ge=0.0, le=100.0, description="Interest & aptitude alignment score")
    feasibility_score: float = Field(ge=0.0, le=100.0, description="Budget, location, and entry-route realism score")
    evidence_quality_score: float = Field(ge=0.0, le=100.0, description="Completeness of student profile inputs")
    
    # Three Separate Communicated Labels (FR-07)
    fit_label: FitLabel = Field(description="Fit classification: Strong, Moderate, Emerging, Insufficient evidence")
    feasibility_label: FeasibilityLabel = Field(description="Feasibility classification: High, Moderate, Challenging, Low")
    evidence_quality_label: EvidenceQualityLabel = Field(description="Evidence quality: High, Moderate, Preliminary, Sparse")
    
    # Structured Explainability (FR-06 - Non-Optional)
    reasons: List[str] = Field(description="Itemized explanations of why this career matches the profile")
    concerns: List[str] = Field(description="Itemized constraints, high costs, exam difficulty, or location hurdles")
    missing_evidence_flags: List[str] = Field(description="Gaps in profile data that introduce uncertainty")
    
    # Selection State (FR-09)
    is_primary_selection: bool = Field(default=False, description="Student selected as Primary Pathway")
    is_backup_selection: bool = Field(default=False, description="Student selected as Realistic Backup")
    
    # Historical Lifecycle & Reassessment (FR-18)
    is_current: bool = Field(default=True, description="True if part of the active batch; False if superseded")
    superseded_at: Optional[datetime] = Field(None, description="Timestamp when reassessment superseded this recommendation")
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### 3.8 Roadmaps & Milestones (`Roadmap`, `RoadmapMilestone`) — Traces to FR-10, FR-11, FR-12, FR-18
Adaptive 30/90/180-day execution plan with dependencies, low-cost resources, fallback branches, and lifecycle preservation.

```python
class RoadmapMilestone(BaseModel):
    id: str = Field(description="Unique UUID for milestone")
    roadmap_id: str = Field(description="Foreign key referencing Roadmap.id")
    timeframe_bucket: TimeframeBucket = Field(description="next_7_days, day_30, day_90, or day_180")
    order_index: int = Field(ge=1, description="Execution sequence within bucket")
    title: str = Field(description="Actionable milestone title")
    description: str = Field(description="Detailed instructions and expected output")
    milestone_type: MilestoneType = Field(description="Milestone classification")
    
    # Actionability & Resources (FR-10, FR-12)
    prerequisites: List[str] = Field(default_factory=list, description="Prior milestones required before starting")
    estimated_cost_inr: int = Field(default=0, description="Estimated out-of-pocket cost in INR")
    is_low_cost_or_free: bool = Field(default=True)
    free_resource_url: Optional[str] = Field(None, description="Direct URL to free learning material")
    
    # Verification & Evidence (FR-10)
    completion_evidence_type: EvidenceType = Field(default=EvidenceType.SELF_REPORT)
    completion_evidence_note_or_url: Optional[str] = Field(None, description="Proof submitted by student (URL or text)")
    is_completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    
    # Fallback branch (FR-10)
    fallback_action: str = Field(
        description="Predefined alternative step if milestone is blocked, failed, or student loses interest"
    )

class Roadmap(BaseModel):
    id: str = Field(description="Unique UUID for roadmap")
    student_id: str = Field(description="Foreign key referencing StudentProfile.id")
    primary_career_id: str = Field(description="Foreign key referencing primary CareerLibrary.id")
    backup_career_id: Optional[str] = Field(None, description="Foreign key referencing backup CareerLibrary.id")
    status: str = Field(default="active", description="'active', 'paused', 'completed', 'reassessing'")
    
    # Historical Lifecycle & Reassessment (FR-18)
    is_current: bool = Field(default=True, description="True if active roadmap; False if superseded by pathway pivot")
    superseded_at: Optional[datetime] = Field(None, description="Timestamp when roadmap was superseded")
    
    milestones: List[RoadmapMilestone] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### 3.9 Parent Summaries (`ParentSummary`) — Traces to FR-17
Persisted plain-language summary of recommendations, costs, trade-offs, and next steps for parents, bound to a specific recommendation batch.

> **Architectural Decision on Persistence vs Regeneration:**  
> Parent summaries are **stored per-generation** upon recommendation completion rather than re-generated on every view.  
> *Rationale:*  
> 1. **Consistency & Alignment:** Guarantees that both guardian and student view the identical plain-language narrative during family discussions without non-deterministic LLM wording drift.  
> 2. **Auditability:** Retains an immutable record of what advice and cost estimates were communicated to guardians.  
> 3. **Latency & Cost:** Eliminates unnecessary LLM API calls on subsequent dashboard page loads.

```python
class ParentSummary(BaseModel):
    id: str = Field(description="Unique UUID for parent summary")
    student_id: str = Field(description="Foreign key referencing StudentProfile.id")
    recommendation_batch_id: str = Field(description="Foreign key referencing RecommendationBatch.id")
    summary_text: str = Field(description="Generated plain-language breakdown of paths, costs, risks, and next steps")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### 3.10 Chat Interactions & Grounding Audit (`ChatInteraction`) — Traces to FR-16
Auditable record of student queries and single-turn LLM responses, recording exact database records injected into prompt context.

```python
class ChatInteraction(BaseModel):
    id: str = Field(description="Unique UUID for chat interaction")
    student_id: Optional[str] = Field(None, description="Foreign key referencing StudentProfile.id; NULL if account was erased (retained for safety audit)")
    question_text: str = Field(description="Raw student query text")
    career_ids_injected: List[str] = Field(
        description="Exact career_library.id slugs retrieved from Postgres and injected into LLM system prompt context"
    )
    answer_text: str = Field(description="LLM response provided to the student")
    was_escalated: bool = Field(
        default=False, 
        description="True if query triggered a human counselor referral or safety crisis protocol (PRD Section 14)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### 3.11 Counselor Escalation (`CounselorEscalation`) — Traces to FR-15, PRD Section 14
Safety and human-in-the-loop escalation workflow for complex cases, deadlock, or low-evidence recommendations.

```python
class CounselorEscalation(BaseModel):
    id: str = Field(description="Unique UUID for escalation ticket")
    student_id: Optional[str] = Field(None, description="Foreign key referencing StudentProfile.id; NULL if account was erased (retained for safety audit)")
    trigger_reason: EscalationTrigger = Field(description="Trigger category (e.g. deadlock, low evidence, safety)")
    status: EscalationStatus = Field(default=EscalationStatus.PENDING)
    
    # Student Context Snapshot
    student_summary_snapshot: Dict[str, Any] = Field(
        description="Frozen JSON snapshot of profile, recommendations, and guardian differences at escalation time"
    )
    
    # Counselor Review & Override (PRD Section 14)
    counselor_user_id: Optional[str] = Field(None, description="Assigned counselor identifier")
    counselor_notes: Optional[str] = Field(None, description="Confidential counselor assessment notes")
    counselor_override_decision: Optional[str] = Field(None, description="Counselor-modified pathway recommendation")
    counselor_override_rationale: Optional[str] = Field(
        None, 
        description="Mandatory explanation if counselor modifies system recommendations (PRD Section 14)"
    )
    
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled 1-on-1 counseling session time")
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```
