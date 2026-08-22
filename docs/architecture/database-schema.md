# System Architecture: Database Schema & Seed Data Ingestion

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/database-schema.md`  
**Status:** Approved Architectural Baseline  
**Source of truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Companion shards:** 
- `docs/architecture/tech-stack.md`
- `docs/architecture/data-models.md`
- `docs/architecture/core-workflows.md`
- `docs/architecture/source-tree.md`

---

## 1. Database Principles & Storage Engine

- **RDBMS Engine:** PostgreSQL 16.x (Relational system of record with native `JSONB` support).
- **ORM & Migrations:** SQLAlchemy 2.0.x with Alembic 1.13.x.
- **Strict Anti-Speculation Rule:** No vector database (`pgvector`, ChromaDB, Pinecone) or live RAG/ETL streaming pipelines. The dataset is small, structured, and curated.
- **History Preservation & Reassessment:** To prevent data loss during student reassessment cycles (FR-18), `roadmaps`, `recommendation_batches`, and `recommendations` avoid destructive single-row unique constraints. Instead, historical cycles are grouped under `recommendation_batches` and soft-superseded via `is_current = FALSE` and `superseded_at = NOW()`.
- **Safety Audit Retention Exception:** In accordance with PRD Section 14 and child safety regulations, `counselor_escalations` with `trigger_reason = 'crisis_safety_flag'` and `chat_interactions` with `was_escalated = TRUE` are **exempt from cascading erasure**. They use `ON DELETE SET NULL` at the schema level and an application-level anonymization service to strip PII while preserving safety incident audit trails.
- **One-Time Deterministic Ingestion:** Seed datasets are parsed and loaded into Postgres tables using an idempotent, transaction-safe Python seeding CLI (`python -m backend.data.seed_db`).

---

## 2. PostgreSQL DDL Specification

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. AUTHENTICATION & USERS
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'guardian', 'counselor', 'admin')),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 2. STUDENT PROFILES (FR-01, FR-02, FR-20)
-- ============================================================================
CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    education_stage VARCHAR(50) NOT NULL CHECK (education_stage IN ('class_8_10', 'class_11_12', 'early_college')),
    grade_or_year VARCHAR(100) NOT NULL,
    current_stream VARCHAR(100),
    interests JSONB DEFAULT '[]'::jsonb NOT NULL,
    aptitude_signals JSONB DEFAULT '{}'::jsonb NOT NULL,
    work_style_preferences JSONB DEFAULT '{}'::jsonb NOT NULL,
    budget_tier VARCHAR(50) DEFAULT 'moderate_up_to_2_lakhs' NOT NULL 
        CHECK (budget_tier IN ('low_cost_only', 'moderate_up_to_2_lakhs', 'flexible_above_2_lakhs')),
    relocation_willingness VARCHAR(50) DEFAULT 'within_state' NOT NULL
        CHECK (relocation_willingness IN ('home_district_only', 'within_state', 'anywhere_in_india', 'abroad')),
    preferred_languages JSONB DEFAULT '["English", "Hindi"]'::jsonb NOT NULL,
    
    -- Minor Consent & Governance (FR-20)
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('guardian_consent_minor', 'self_consent_adult')),
    consent_given_by UUID REFERENCES users(id), -- Mandatory for Class 8-10 & 11-12; Nullable only if adult
    consent_recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    academic_records_available BOOLEAN DEFAULT FALSE NOT NULL,
    profile_completeness_pct INT DEFAULT 0 CHECK (profile_completeness_pct BETWEEN 0 AND 100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX idx_student_profiles_stage ON student_profiles(education_stage);
CREATE INDEX idx_student_profiles_interests ON student_profiles USING gin(interests);

-- ============================================================================
-- 3. GUARDIAN CONTEXT (FR-03, FR-17)
-- ============================================================================
CREATE TABLE guardian_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    guardian_name VARCHAR(255),
    relationship_to_student VARCHAR(100) NOT NULL,
    guardian_priorities JSONB DEFAULT '[]'::jsonb NOT NULL,
    financial_ceiling_inr INT,
    relocation_restriction VARCHAR(50) DEFAULT 'within_state' NOT NULL
        CHECK (relocation_restriction IN ('home_district_only', 'within_state', 'anywhere_in_india', 'abroad')),
    notes_and_concerns TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_guardian_student UNIQUE (student_id, relationship_to_student)
);

CREATE INDEX idx_guardian_contexts_student ON guardian_contexts(student_id);

-- ============================================================================
-- 4. CAREER LIBRARY (FR-04, PRD Section 13.1)
-- ============================================================================
CREATE TABLE career_library (
    id VARCHAR(100) PRIMARY KEY, -- Slug identifier e.g. 'data-scientist'
    onet_soc_code VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    cluster VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    work_reality_summary TEXT NOT NULL,
    applicable_stages JSONB NOT NULL, -- e.g. ["class_11_12", "early_college"]
    job_zone INT NOT NULL CHECK (job_zone BETWEEN 1 AND 5),
    riasec_code VARCHAR(10) NOT NULL,
    riasec_scores JSONB NOT NULL, -- {"R": 1.2, "I": 6.8, "A": 2.1, "S": 3.5, "E": 4.2, "C": 4.9}
    india_entry_routes JSONB NOT NULL, -- Array of IndiaEntryRoute objects
    prerequisites JSONB DEFAULT '[]'::jsonb NOT NULL,
    risks_and_tradeoffs JSONB DEFAULT '[]'::jsonb NOT NULL,
    regional_caveats TEXT,
    content_owner VARCHAR(255) NOT NULL,
    review_cycle_months INT DEFAULT 12 NOT NULL,
    last_reviewed_date DATE NOT NULL,
    source_links JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_career_library_cluster ON career_library(cluster);
CREATE INDEX idx_career_library_riasec ON career_library(riasec_code);
CREATE INDEX idx_career_library_stages ON career_library USING gin(applicable_stages);

-- ============================================================================
-- 5. CAREER SKILLS & FREE-FIRST RESOURCES (FR-11, FR-12, PRD Section 13.3)
-- ============================================================================
CREATE TABLE career_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_id VARCHAR(100) NOT NULL REFERENCES career_library(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('essential', 'useful', 'optional')),
    description TEXT NOT NULL,
    free_learning_resource_name VARCHAR(255) NOT NULL,
    free_learning_resource_url TEXT NOT NULL,
    paid_learning_resource_name VARCHAR(255),
    paid_learning_resource_url TEXT,
    commercial_disclosure TEXT DEFAULT 'Independent curated resource. No commercial commission or affiliation.' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_career_skills_career ON career_skills(career_id);
CREATE INDEX idx_career_skills_category ON career_skills(category);

-- ============================================================================
-- 6. SCHOLARSHIPS (FR-13, PRD Section 13.4) - Seeded from Scholar-Spot
-- ============================================================================
CREATE TABLE scholarships (
    id INT PRIMARY KEY, -- Seeded from Scholar-Spot ID
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    sponsor_type VARCHAR(50) NOT NULL CHECK (sponsor_type IN ('Government', 'Private', 'Institutional')),
    target_category VARCHAR(100) NOT NULL,
    income_ceiling_inr INT NOT NULL, -- 0 for no limit
    min_qualification VARCHAR(100) NOT NULL,
    amount_description TEXT NOT NULL,
    eligibility_summary TEXT NOT NULL,
    deadline_description VARCHAR(255) NOT NULL,
    required_documents JSONB DEFAULT '["Income Certificate", "Caste Certificate", "Domicile Certificate", "Mark Sheet", "Aadhaar Card"]'::jsonb NOT NULL,
    official_source_url TEXT NOT NULL,
    last_verified_date DATE NOT NULL,
    renewal_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_scholarships_state ON scholarships(state);
CREATE INDEX idx_scholarships_category ON scholarships(target_category);
CREATE INDEX idx_scholarships_income ON scholarships(income_ceiling_inr);
CREATE INDEX idx_scholarships_qualification ON scholarships(min_qualification);

-- ============================================================================
-- 7. MARKET SNAPSHOTS (FR-14, PRD Section 13.2) - Seeded from Naukri Dataset
-- ============================================================================
CREATE TABLE market_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_id VARCHAR(100) NOT NULL REFERENCES career_library(id) ON DELETE CASCADE,
    geography VARCHAR(255) NOT NULL,
    timeframe_period VARCHAR(255) NOT NULL,
    data_source VARCHAR(255) DEFAULT 'Naukri India Job Postings Sample' NOT NULL,
    demand_indicator VARCHAR(50) NOT NULL CHECK (demand_indicator IN ('High', 'Moderate', 'Emerging', 'Stable', 'Niche')),
    salary_range_entry_inr VARCHAR(100) NOT NULL,
    salary_range_mid_inr VARCHAR(100) NOT NULL,
    top_demanded_skills JSONB DEFAULT '[]'::jsonb NOT NULL,
    top_hiring_locations JSONB DEFAULT '[]'::jsonb NOT NULL,
    experience_distribution JSONB DEFAULT '{}'::jsonb NOT NULL,
    competition_caveat TEXT NOT NULL,
    uncertainty_statement TEXT NOT NULL,
    last_updated_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_market_snapshots_career ON market_snapshots(career_id);

-- ============================================================================
-- 8. RECOMMENDATION BATCHES & RECOMMENDATIONS (FR-05, FR-06, FR-07, FR-09, FR-18)
-- ============================================================================
-- Recommendation batch entity to group a scoring cycle
CREATE TABLE recommendation_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    batch_number INT NOT NULL, -- 1 for initial onboarding, 2+ for reassessment cycles
    is_current BOOLEAN DEFAULT TRUE NOT NULL,
    superseded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_rec_batches_student_current ON recommendation_batches(student_id, is_current);

-- Individual ranked career options within a batch
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES recommendation_batches(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    career_id VARCHAR(100) NOT NULL REFERENCES career_library(id) ON DELETE CASCADE,
    career_title VARCHAR(255) NOT NULL,
    rank_position INT NOT NULL CHECK (rank_position BETWEEN 1 AND 5),
    composite_score NUMERIC(5,2) NOT NULL CHECK (composite_score BETWEEN 0.0 AND 100.0),
    fit_score NUMERIC(5,2) NOT NULL CHECK (fit_score BETWEEN 0.0 AND 100.0),
    feasibility_score NUMERIC(5,2) NOT NULL CHECK (feasibility_score BETWEEN 0.0 AND 100.0),
    evidence_quality_score NUMERIC(5,2) NOT NULL CHECK (evidence_quality_score BETWEEN 0.0 AND 100.0),
    fit_label VARCHAR(50) NOT NULL CHECK (fit_label IN ('Strong', 'Moderate', 'Emerging', 'Insufficient evidence')),
    feasibility_label VARCHAR(50) NOT NULL CHECK (feasibility_label IN ('High', 'Moderate', 'Challenging', 'Low')),
    evidence_quality_label VARCHAR(50) NOT NULL CHECK (evidence_quality_label IN ('High', 'Moderate', 'Preliminary', 'Sparse')),
    reasons JSONB DEFAULT '[]'::jsonb NOT NULL,
    concerns JSONB DEFAULT '[]'::jsonb NOT NULL,
    missing_evidence_flags JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_primary_selection BOOLEAN DEFAULT FALSE NOT NULL,
    is_backup_selection BOOLEAN DEFAULT FALSE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE NOT NULL,
    superseded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_recommendations_batch ON recommendations(batch_id);
CREATE INDEX idx_recommendations_student_current ON recommendations(student_id, is_current);
CREATE INDEX idx_recommendations_career ON recommendations(career_id);

-- ============================================================================
-- 9. ROADMAPS & MILESTONES (FR-10, FR-11, FR-12, FR-18)
-- ============================================================================
-- History preserved across reassessment cycles via is_current flag
CREATE TABLE roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    primary_career_id VARCHAR(100) NOT NULL REFERENCES career_library(id),
    backup_career_id VARCHAR(100) REFERENCES career_library(id),
    status VARCHAR(50) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'reassessing')),
    is_current BOOLEAN DEFAULT TRUE NOT NULL,
    superseded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_roadmaps_student_current ON roadmaps(student_id, is_current);

CREATE TABLE roadmap_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
    timeframe_bucket VARCHAR(50) NOT NULL CHECK (timeframe_bucket IN ('next_7_days', 'day_30', 'day_90', 'day_180')),
    order_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN (
        'exploration', 'foundational_learning', 'skill_check', 'exam_prep', 'project_output', 'scholarship_application', 'reassessment'
    )),
    prerequisites JSONB DEFAULT '[]'::jsonb NOT NULL,
    estimated_cost_inr INT DEFAULT 0 NOT NULL,
    is_low_cost_or_free BOOLEAN DEFAULT TRUE NOT NULL,
    free_resource_url TEXT,
    completion_evidence_type VARCHAR(50) DEFAULT 'self_report' NOT NULL 
        CHECK (completion_evidence_type IN ('self_report', 'project_artifact', 'quiz_score', 'mentor_confirmation')),
    completion_evidence_note_or_url TEXT,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ,
    fallback_action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_roadmap_milestones_roadmap ON roadmap_milestones(roadmap_id);
CREATE INDEX idx_roadmap_milestones_bucket ON roadmap_milestones(timeframe_bucket);

-- ============================================================================
-- 10. PARENT SUMMARIES (FR-17) - Persisted per generation
-- ============================================================================
CREATE TABLE parent_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    recommendation_batch_id UUID NOT NULL REFERENCES recommendation_batches(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_parent_summaries_batch ON parent_summaries(recommendation_batch_id);
CREATE INDEX idx_parent_summaries_student ON parent_summaries(student_id);

-- ============================================================================
-- 11. CHAT INTERACTIONS & GROUNDING AUDIT (FR-16) - Safety Retention Exception
-- ============================================================================
-- Non-escalated rows are deleted on account erasure; was_escalated=TRUE rows
-- are anonymized (student_id set to NULL) to retain safety audit trails.
CREATE TABLE chat_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    career_ids_injected JSONB NOT NULL, -- Array of career_library slugs injected into system prompt
    answer_text TEXT NOT NULL,
    was_escalated BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_chat_interactions_student ON chat_interactions(student_id);
CREATE INDEX idx_chat_interactions_created ON chat_interactions(created_at);
CREATE INDEX idx_chat_interactions_escalated ON chat_interactions(was_escalated);

-- ============================================================================
-- 12. COUNSELOR ESCALATIONS (FR-15, PRD Section 14) - Safety Retention Exception
-- ============================================================================
-- Standard escalations are deleted on account erasure; crisis_safety_flag rows
-- are retained with student_id = NULL and anonymized snapshot for compliance.
CREATE TABLE counselor_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE SET NULL,
    trigger_reason VARCHAR(100) NOT NULL CHECK (trigger_reason IN (
        'high_stakes_choice', 'severe_constraint_conflict', 'student_parent_deadlock', 'low_evidence_profile', 'student_requested', 'crisis_safety_flag'
    )),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'under_review', 'session_scheduled', 'resolved', 'overridden')),
    student_summary_snapshot JSONB NOT NULL,
    counselor_user_id UUID REFERENCES users(id),
    counselor_notes TEXT,
    counselor_override_decision TEXT,
    counselor_override_rationale TEXT,
    scheduled_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_escalations_student ON counselor_escalations(student_id);
CREATE INDEX idx_escalations_status ON counselor_escalations(status);
CREATE INDEX idx_escalations_trigger ON counselor_escalations(trigger_reason);
```

---

## 3. Seed Data Ingestion & Mapping Architecture

### 3.1 Overview
In accordance with the locked **Tech Stack** (which excludes RAG, streaming ETL, Kafka, or vector indexing), dataset ingestion is implemented as an **idempotent, one-time Python CLI seed runner** triggered during deployment (`python -m backend.data.seed_db`).

```
/data/seed/
├── mappings/
│   ├── naukri_title_to_career_map.json   # Manual lookup table mapping job titles to career_library.id
│   └── onet_skill_tier_overrides.json     # Content-owner override table for skill importance tiers
├── seed_scholarships.csv                  # Direct copy of Scholar-Spot CSV
├── seed_market_snapshots.csv              # Naukri postings raw source
├── seed_career_clusters.json              # Localized O*NET v30.3 taxonomy with Indian entry routes & exams
└── seed_runner.py                         # SQLAlchemy batch ingestion with transaction safety
```

---

### 3.2 Dataset Mapping Logic & Ownership

#### A. Naukri Job Title Matching (Issue 5a Resolution)
- **Mechanism:** Explicit, version-controlled **JSON lookup table** (`/data/seed/mappings/naukri_title_to_career_map.json`) maintained by the SME / Content Owner.
- **Rules:**
  1. The seed script iterates through job postings and resolves `Job_Titles` against the lookup dictionary (e.g., `"Senior Manager - Data Science" -> "data-scientist"`, `"Data Science Domain Manager" -> "data-scientist"`, `"Advance Analytical and Data Sciences - Manager" -> "data-scientist"`).
  2. Postings with unmapped titles are logged to a seed report (`/data/seed/unmapped_titles.log`) for SME review rather than guessed with fuzzy matching, ensuring data integrity.
  3. Mapped records are aggregated by `career_id` to compute skill frequency distributions and salary ranges.

#### B. O*NET Skills Categorization & Normalization (Issue 1 & 5b Resolution)
- **Raw Scale in Source:** O*NET `essential_skills.csv` provides raw Importance ratings (`Scale ID: IM`) on a **1.0 to 5.0 scale**.
- **Standard Normalization Formula:**
  $$\text{Standardized Score (0–100)} = \frac{\text{Raw Importance Score} - 1.0}{4.0} \times 100$$
- **Categorization Cutoffs (Both Scaled and Raw):**

| Category | Standardized Score (0–100) | Equivalent Raw O*NET Score (1–5) | Operational Definition |
|---|---|---|---|
| **`essential`** | $\ge 70.0$ | $\ge 3.80$ | Core foundational competence indispensable for everyday job execution (FR-11). |
| **`useful`** | $50.0 \le \text{Score} < 70.0$ | $3.00 \le \text{Raw} < 3.80$ | High-value complementary skill enhancing career progression. |
| **`optional`** | $< 50.0$ | $< 3.00$ | Specialized tool, niche requirement, or elective skill. |

- **Manual Override:** The SME / Content Owner inspects the categorized skills and applies localized overrides via `/data/seed/mappings/onet_skill_tier_overrides.json` where Indian market requirements prioritize tools differently (e.g., boosting specific programming languages or accounting software).

#### C. Scholar-Spot Scholarships Mapping
- **Rules:**
  1. Strip leading/trailing spaces on headers (`Income `, `Type `).
  2. Map `LINKS` directly to `official_source_url`.
  3. Populate mandatory governance fields: `last_verified_date` (`2026-08-20`), `is_active` (`TRUE`), `deadline_description` (`Annual portal cycle`).
