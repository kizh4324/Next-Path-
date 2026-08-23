# Complete Unified System Architecture Specification

## AI-Based Career Decision & Pathway Companion

**Document:** Single Consolidated Architecture — `docs/architecture/full_architecture.md`  
**Status:** Approved Architectural Baseline  
**Source of Truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Design System Source:** `docs/AI_Career_Guidance_Design_System-6.md` (Design System v6)  
**Consolidated Shards:** `introduction.md`, `tech-stack.md`, `components.md`, `database-schema.md`, `data-models.md`, `api-specification.md`, `core-workflows.md`, `security-and-privacy.md`, `deployment-and-infrastructure.md`, `coding-standards.md`, `source-tree.md`

---

## Table of Contents
1. [Executive Summary, Problem Context & Architecture Invariants](#1-executive-summary-problem-context--architecture-invariants)
2. [Definitive Tech Stack & Technology Matrix](#2-definitive-tech-stack--technology-matrix)
3. [Component Architecture & System Boundaries](#3-component-architecture--system-boundaries)
4. [Database Schema & Seed Data Ingestion](#4-database-schema--seed-data-ingestion)
5. [Data Models & Pydantic Specifications](#5-data-models--pydantic-specifications)
6. [RESTful API Specification & Contracts](#6-restful-api-specification--contracts)
7. [Core Workflows & Recommendation Engine Logic](#7-core-workflows--recommendation-engine-logic)
8. [Security, Privacy & Minor Governance](#8-security-privacy--minor-governance)
9. [Deployment, Infrastructure & DevOps](#9-deployment-infrastructure--devops)
10. [Coding Standards & Engineering Conventions](#10-coding-standards--engineering-conventions)
11. [Repository Source Tree & Project Layout](#11-repository-source-tree--project-layout)

---

## 1. Executive Summary, Problem Context & Architecture Invariants

### 1.1 Executive Summary & Problem Context
The **AI-Based Career Decision & Pathway Companion** is designed for Indian school and early-college students navigating critical education transitions:
- **Stream Selection:** Class 8–10
- **Degree & Entrance Path:** Class 11–12
- **Pathway Correction / Early Career Specialization:** Early College

#### Product Thesis (Traceable to PRD Section 1 & 2)
Students do not suffer from an information shortage — career information is fragmented across tests, portals, colleges, job boards, social media, and word of mouth. The core problem is converting fragmented signals into a **trusted, affordable, feasible next step** with verifiable evidence and human escalation.

The system is fundamentally structured as a **Decision-Support Companion**, explicitly rejecting:
1. **Black-box prophecy / destiny predictions:** The platform never claims to pick "one perfect career" or "predict a student's destiny" (PRD Section 1, 15).
2. **Unvalidated psychometric accuracy claims:** Recommendations provide inspectable evidence, separate fit from feasibility, and highlight missing evidence (FR-06, FR-07).
3. **Hidden commercial bias:** Free and public entry routes are prioritized, and commercial links are disclosed (FR-12, Section 13.3).

---

### 1.2 Core User Outcomes (Traceable to PRD Section 1.2)
Every completed journey through the architecture guarantees:
1. **Multi-Option Shortlist (3–5 Pathways):** Suitable clusters/pathways presented side-by-side with clear rationale, constraints, and trade-offs (FR-05, FR-08).
2. **Three-Tier Transparent Scoring:** Explicit separation of **Personal Fit**, **Practical Feasibility**, and **Evidence Quality** (FR-07).
3. **Primary & Backup Selection:** A primary trajectory paired with a realistic, low-regret fallback branch (FR-09).
4. **Actionable 30/90/180-Day Adaptive Roadmap:** Step-by-step milestones, free/low-cost resources, entrance exams, and verified scholarship deadlines (FR-10, FR-11, FR-12, FR-13).
5. **Guardian Alignment & Counselor Escalation:** Structured parent summaries and human counselor routing for high-stakes or low-evidence scenarios (FR-15, FR-17).

---

### 1.3 High-Level Architecture Invariants
This technical architecture is governed by five strict invariants:

1. **Deterministic, Explainable Scoring Engine (FR-05/06/07):**  
   The recommendation engine uses a transparent, inspectable weighted-sum scoring algorithm implemented in plain Python (`score = w1·interest_match + w2·aptitude_match + w3·feasibility_score − penalty·missing_evidence`). No black-box machine learning models or RAG vector pipelines exist at MVP stage.
2. **Narrow, Grounded LLM Interfaces (FR-16, FR-17):**  
   LLM integration is strictly restricted to two single-turn stateless calls via Anthropic API (Claude Messages API):
   - *Career Q&A Chatbot (FR-16):* Grounded entirely within approved career library database records injected into prompt context, logged in `chat_interactions` for full auditability.
   - *Parent Summary Generator (FR-17):* Deterministic translation of structured recommendation data into a plain-language guardian overview, persisted per generation.
3. **Relational System of Record with Immutable History & Mandatory Governance:**  
   PostgreSQL 16 serves as the single source of truth. All domain entities enforce non-optional governance metadata per PRD Section 13. Reassessment preserves prior recommendations and roadmaps via soft-superseding (`is_current = FALSE, superseded_at = NOW()`), ensuring full student trajectory history is retained.
4. **Offline & Low-Bandwidth Resilience (FR-19):**  
   Progressive Web App (PWA) shell with client-side caching (TanStack Query) ensures multi-step onboarding and roadmap viewing function reliably over basic smartphones and intermittent 2G/3G connectivity.
5. **Minor Safety & Zero-Trust Access Control (FR-20, PRD Section 13/16):**  
   Data protection relies on mandatory guardian consent for minors (`consent_given_by`), end-to-end transport encryption (TLS 1.3), transparent at-rest disk encryption managed by the PostgreSQL hosting platform (AES-256), and strict application-level Role-Based Access Control (RBAC). No unpinned application-level column ciphers are introduced at MVP stage.

---

## 2. Definitive Tech Stack & Technology Matrix

### 2.1 Technology Selection Principles
1. **No speculative infrastructure:** A technology is only added when a specific PRD requirement (Section 12 or Section 20) needs it — not because it's common in similar products.
2. **Exact versions, pinned:** No `latest`, no unpinned `^` ranges left to drift in production.
3. **Explainability over black-box ML:** Per FR-06/FR-07, the recommendation logic must be inspectable.
4. **One deployment target class per layer:** Managed platforms (not raw VMs/Kubernetes) at pilot scale, to match MVP timeline and team size.

---

### 2.2 Definitive Technology Selections Table

| Category | Technology | Version | Purpose | Rationale (tied to PRD) |
|---|---|---|---|---|
| Frontend Language | TypeScript | 5.6.x | Type-safe UI code | Stage-aware onboarding (FR-01) and multi-field profile forms (FR-02/03) benefit from compile-time shape checking across many conditional form paths. |
| Frontend Framework | React | 18.3.x | UI rendering | No SSR/SEO requirement in the PRD; a client-rendered SPA is sufficient and simpler to ship. |
| Build Tool | Vite | 5.4.x | Dev server + bundler | Lighter than a full meta-framework (Next.js) for a form/dashboard app with no server-rendering requirement. |
| Styling | Tailwind CSS | 3.4.x | Utility-first styling | No separate design-system build; fast iteration for hackathon/pilot timeline. |
| Form Handling | React Hook Form | 7.53.x | Multi-step form state | Required for stage-aware onboarding (FR-01) with conditional branches per education stage. |
| Schema Validation (client) | Zod | 3.23.x | Form/input validation | Mirrors backend Pydantic models conceptually; keeps validation rules in one readable schema per form. |
| Data Fetching / Cache | TanStack Query | 5.59.x | Server-state management | Replaces need for a Redis-backed client cache; sufficient at pilot scale. |
| Routing | React Router | 6.27.x | Client-side routing | Standard SPA routing for onboarding → results → roadmap → dashboard flow. |
| Charts | Recharts | 2.13.x | Progress dashboard visuals | **P1 only** (FR-28). Do not install until the progress-dashboard story is picked up. |
| Offline/Low-Bandwidth | `vite-plugin-pwa` | 0.20.x | PWA/offline shell | Directly required by FR-19 ("core assessment, results, and roadmap can be completed on a basic smartphone with intermittent connectivity"). |
| Backend Language | Python | 3.12.x | API + scoring logic | Existing team familiarity; strong fit for the weighted-scoring recommendation function and LLM API calls. |
| Backend Framework | FastAPI | 0.115.x | REST API | Async support, automatic OpenAPI docs (useful for pilot/demo review), native Pydantic integration. |
| Data Validation | Pydantic | 2.9.x | Request/response + domain models | Enforces governance fields required by PRD Section 13 as non-optional model fields (e.g., scholarship entries must carry eligibility, deadline, source, last-verified date). |
| ORM | SQLAlchemy | 2.0.x | Database access layer | Standard, mature; no need for a separate query builder. |
| Migrations | Alembic | 1.13.x | Schema migrations | Paired with SQLAlchemy; tracks career-library/schema evolution across pilot phases. |
| Primary Database | PostgreSQL | 16.x | System of record | All PRD data is structured/relational: student profiles, guardian inputs, career library, roadmaps, scholarships, escalations. No unstructured-search requirement exists at MVP scope. |
| Authentication | `python-jose` + `passlib[bcrypt]` | jose 3.3.x / passlib 1.7.x | JWT auth + password hashing | Simple session auth; sufficient for pilot user base (students, guardians, counselors). |
| Background Scheduling | APScheduler | 3.10.x | Scholarship deadline checks | **P1 only** (FR-27). In-process scheduler avoids standing up a task-queue + broker (e.g., Celery + Redis) before there's real job volume. |
| LLM Provider | Anthropic API (Claude) | Messages API, current stable model | Career Q&A chatbot (FR-16) + parent-summary generation (FR-17) | Two narrow, direct API calls — not an agent framework. |
| Recommendation Engine | Plain Python (no ML framework) | — | Career-fit scoring (FR-05/06/07) | Weighted-sum scoring function with inspectable component scores. |
| Testing (backend) | Pytest + httpx | pytest 8.3.x / httpx 0.27.x | API and logic tests | Standard Python testing stack; httpx for FastAPI endpoint tests. |
| Testing (frontend) | Vitest + React Testing Library | vitest 2.1.x / RTL 16.0.x | Component/unit tests | Pairs natively with Vite; avoids adding Jest's separate config layer. |
| Containerization | Docker + Docker Compose | Docker Engine 27.x | Local dev + reproducible builds | Single `docker-compose.yml` (frontend, backend, Postgres) for consistent local/demo environments. |
| Frontend Hosting | Vercel or Netlify | — | Static/SPA hosting | Managed platform; no infra provisioning needed at pilot scale. |
| Backend Hosting | Render or Railway | — | API hosting | Managed container hosting; avoids raw VM/Kubernetes setup for MVP timeline. |
| Database Hosting | Managed Postgres (Render/Railway/Supabase) | PostgreSQL 16.x | Hosted primary DB | Matches backend hosting choice; automated backups included. |
| Version Control | Git + GitHub | — | Source control | Standard; also hosts CI if added later. |
| Logging | Python `logging` (stdlib) + platform dashboards | — | Application logs | Platform-provided logs (Render/Vercel) are sufficient at pilot scale; no separate log-aggregation service required yet. |

---

### 2.3 Explicitly Excluded Technologies

| Technology | Why it is NOT in this stack |
|---|---|
| Vector database (Pinecone, ChromaDB, `pgvector`) | The career library at MVP/pilot scope (PRD Section 20) is a small, curated set of clusters that fits directly as text in an LLM prompt. No semantic-search requirement exists yet. |
| RAG framework (LangChain, LlamaIndex) | Same reason — retrieval is a plain lookup by career ID, not a search problem, at this data volume. |
| Redis | No caching requirement beyond what TanStack Query (client) and normal HTTP caching (server) already cover at pilot scale. |
| Celery / task queue + broker | APScheduler (in-process) is sufficient for the only background job in scope (FR-27, P1). |
| scikit-learn, pandas, numpy | No statistical/ML modeling requirement in P0. The recommendation engine is transparent weighted-sum scoring, not a trained model — this is also a better fit for the explainability requirement (FR-06) than an ML approach would be. |
| GraphQL | Nothing in the PRD needs client-defined flexible queries; REST + OpenAPI is simpler to document and consume for this feature set. |
| Kubernetes | Team size and MVP timeline don't justify container-orchestration overhead; managed platform hosting (Render/Railway/Vercel) covers the deployment needs. |

---

### 2.4 Rationale on Two Non-Obvious Decisions

1. **Recommendation engine is not an LLM call and not an ML model:**  
   FR-05/06/07 require 3–5 ranked career options with explicit reasons, concerns, and missing-evidence flags — and PRD Section 20 explicitly excludes "claims of psychometric accuracy before validation." A weighted-sum function (`score = w1·interest_match + w2·aptitude_match + w3·feasibility_score − penalty·missing_evidence`) makes every contributing factor a stored, auditable number, which satisfies the explainability requirement directly rather than requiring a separate explanation layer bolted onto a black-box model.

2. **LLM usage is scoped to exactly two calls, with no memory or agent loop:**  
   - **Career chatbot (FR-16):** System prompt restricts answers to the career-library entries relevant to the student's query, injected directly into the prompt as plain text/JSON (this *is* the retrieval step — a database lookup by career ID, not a vector search).
   - **Parent summary (FR-17):** Structured recommendation output goes in, one plain-language paragraph comes out — deterministic input, no chained reasoning steps.  
   Both are single-turn API calls against the LLM provider's standard Messages endpoint. No agent framework, tool-use loop, or persistent conversation memory is required for either.

---

### 2.5 Growth Triggers & Migration Paths

| Trigger | Architectural Evolution |
|---|---|
| Career library grows past what fits in an LLM context window (roughly hundreds of entries with long-form content) | Introduce `pgvector` or a dedicated vector DB for retrieval — Phase 2/3 per PRD Section 21. |
| Real concurrent-user load causes measured DB read latency | Introduce Redis as a server-side cache layer. |
| Phase 2 practical skill checks (FR-21) and project evidence (FR-22) produce enough labeled outcome data | Revisit a trained model for recommendation, alongside counselor-validated outcome tracking required by PRD Section 13.5 before making stronger accuracy claims. |
| Background job volume exceeds what APScheduler can reliably handle in-process | Introduce Celery (or similar) with a broker (Redis/RabbitMQ). |

---

## 3. Component Architecture & System Boundaries

### 3.1 Architectural Component Map

```mermaid
graph TD
    subgraph Frontend ["Frontend (React 18 + TypeScript + Tailwind CSS)"]
        UI_Onboarding["Onboarding & Consent Module (FR-01, FR-02, FR-20)"]
        UI_Results["Results & Comparison View (FR-05, FR-07, FR-08)"]
        UI_Roadmap["Adaptive Roadmap View (FR-10, FR-11, FR-12)"]
        UI_Chat["Career Q&A Chatbot Drawer (FR-16)"]
        UI_Guardian["Parent Summary & Alignment View (FR-03, FR-17)"]
        UI_Counselor["Counselor Review Portal (FR-15)"]
        Cache["TanStack Query Cache + PWA Offline Shell (FR-19)"]
    end

    subgraph Backend ["Backend (FastAPI + Python 3.12)"]
        API_Gateway["FastAPI App Router & RBAC Middleware"]
        MOD_Auth["Auth & Minor Consent Module"]
        MOD_Profile["Profile & Stage Onboarding Module"]
        MOD_RecEngine["Recommendation Engine (Plain Python Weighted-Sum)"]
        MOD_Roadmap["Roadmap & Fallback Engine"]
        MOD_Chatbot["Chatbot Assistant (Grounded Single-Turn LLM)"]
        MOD_ParentSummary["Parent Summary Generator (Single-Turn LLM)"]
        MOD_Escalation["Counselor Escalation & Audit Module"]
        MOD_Seed["One-Time Seed Ingestion CLI"]
    end

    subgraph Database ["PostgreSQL 16 Storage Layer"]
        DB_Users[("users, student_profiles, guardian_contexts")]
        DB_Catalog[("career_library, career_skills, scholarships, market_snapshots")]
        DB_Recs[("recommendation_batches, recommendations, parent_summaries")]
        DB_Execution[("roadmaps, roadmap_milestones, chat_interactions, counselor_escalations")]
    end

    subgraph External ["External Services"]
        LLM_Claude["Anthropic API (Claude Messages)"]
    end

    UI_Onboarding --> Cache
    UI_Results --> Cache
    UI_Roadmap --> Cache
    UI_Chat --> Cache
    UI_Guardian --> Cache
    UI_Counselor --> Cache

    Cache --> API_Gateway

    API_Gateway --> MOD_Auth
    API_Gateway --> MOD_Profile
    API_Gateway --> MOD_RecEngine
    API_Gateway --> MOD_Roadmap
    API_Gateway --> MOD_Chatbot
    API_Gateway --> MOD_ParentSummary
    API_Gateway --> MOD_Escalation

    MOD_Auth --> DB_Users
    MOD_Profile --> DB_Users
    MOD_RecEngine --> DB_Catalog
    MOD_RecEngine --> DB_Recs
    MOD_Roadmap --> DB_Catalog
    MOD_Roadmap --> DB_Execution
    MOD_Chatbot --> DB_Catalog
    MOD_Chatbot --> DB_Execution
    MOD_Chatbot --> LLM_Claude
    MOD_ParentSummary --> DB_Recs
    MOD_ParentSummary --> LLM_Claude
    MOD_Escalation --> DB_Execution
    MOD_Seed --> DB_Catalog
```

---

### 3.2 Backend Module Boundaries & Responsibilities

1. **Authentication & Minor Consent (`backend.modules.auth`):**
   - Issue and verify stateless JWT tokens using `python-jose` and password hashing with `passlib[bcrypt]`.
   - Enforce Role-Based Access Control (RBAC): `student`, `guardian`, `counselor`, `admin`.
   - Validate and record minor consent (`consent_type`, `consent_given_by`, `consent_recorded_at`) per FR-20. Class 8–10 and 11–12 students require an active linked guardian account before onboarding finalization.

2. **Profile & Stage-Aware Onboarding (`backend.modules.profile`):**
   - Validate education-stage branching (`class_8_10`, `class_11_12`, `early_college`) per FR-01.
   - Store interests, non-mandatory aptitude signals, budget tiers, and relocation boundaries per FR-02.
   - Ingest guardian context and priorities separately to calculate alignment metrics per FR-03.
   - Calculate `profile_completeness_pct` and evidence flags.

3. **Recommendation Engine (`backend.modules.recommendations`):**
   - Execute deterministic, transparent weighted-sum scoring across `career_library` records without machine learning or vector search (FR-05, FR-06).
   - Compute separate metric scores and labels: **Fit Evidence** (`Strong`/`Moderate`/`Emerging`), **Practical Feasibility** (`High`/`Moderate`/`Challenging`/`Low`), and **Evidence Quality** (`High`/`Moderate`/`Preliminary`/`Sparse`) per FR-07.
   - Formulate itemized `reasons`, practical `concerns`, and `missing_evidence_flags`.
   - Wrap outputs in a `RecommendationBatch` to preserve historical integrity on reassessment (FR-18).

4. **Adaptive Roadmap Engine (`backend.modules.roadmap`):**
   - Generate initial 30/90/180-day execution milestones for selected primary and backup careers (FR-10).
   - Match skills to curated free/public resources (NPTEL, Swayam, Khan Academy) per FR-12.
   - Signpost active scholarships matching student qualifications, income ceiling, and category per FR-13.
   - Provide deterministic fallback actions for every milestone to prevent student deadlock.
   - Handle milestone completion verification (`self_report`, `quiz_score`, `project_artifact`).

5. **Grounded Chatbot Assistant (`backend.modules.chatbot`):**
   - Intercept student career questions (FR-16).
   - Perform SQL lookup on `career_library` records matching query keywords and inject raw structured records into the prompt context.
   - Invoke single-turn Anthropic API with strict negative grounding system prompt ("Answer only from the provided career data; if unmentioned, state that information is unavailable").
   - Log complete question, injected career IDs, and answer text in `chat_interactions` table for governance auditing.
   - Detect crisis keywords (e.g. self-harm, severe distress) and immediately stop advice, returning emergency helpline contacts and triggering counselor escalation (PRD Section 14).

6. **Parent Summary Generator (`backend.modules.parent_summary`):**
   - Transform structured `RecommendationBatch` data into a plain-language guardian overview (FR-17).
   - Invoke single-turn Anthropic API call with deterministic template.
   - Persist output in `parent_summaries` table keyed to `recommendation_batch_id`.

7. **Counselor Escalation & Review (`backend.modules.escalation`):**
   - Automatically evaluate escalation rules (student-guardian deadlock, low evidence, safety triggers) per FR-15 & PRD Section 14.
   - Provide triage endpoints for human counselors to review frozen profile snapshots (`student_summary_snapshot`).
   - Gracefully handle anonymized safety audit records where `student_id = NULL` (due to account deletion), rendering `[Anonymized / Closed Account]` without requiring active foreign profile joins.
   - Log counselor overrides with mandatory rationale (`counselor_override_rationale`).

8. **Seed Ingestion Component (`backend.data.seed_runner`):**
   - Idempotent CLI script loading Scholar-Spot, Naukri, and O*NET seed datasets into PostgreSQL.
   - Applies title mapping lookup (`/data/seed/mappings/naukri_title_to_career_map.json`) and O*NET importance score normalization ($(\text{raw} - 1) / 4 \times 100$) with cutoff tiers.

---

### 3.3 Frontend Component Structure (Design System v6 Compliant)

All UI components are built in **TypeScript / React 18** using **Tailwind CSS 3.4** tokens specified in `docs/AI_Career_Guidance_Design_System-6.md`:
- **Canvas:** Paper-calm warm background (`bg-[#ffffff]` / `bg-[#f6f5f4]`).
- **Structural Accent:** Primary Blue (`#0075de`, active `#005bab`) for all CTAs and interactive focus states.
- **Decorative Accents:** AI Accent (`#391c57` / `#d6b6f6`), Success (`#1aae39`), Warning (`#dd5b00`), Sky (`#62aef0`), Teal (`#2a9d99`).
- **Typography:** Inter across all 11 standardized scale tiers.

#### Route & View Architecture

| Route Path | View Component | Core Features & Design System Components |
|---|---|---|
| `/onboarding` | `OnboardingWizard` | Multi-step stage-aware questionnaire (`React Hook Form` + `Zod`), minor consent dialog, progress indicator, budget selector. |
| `/results` | `ResultsDashboard` | 3–5 `CareerCard` shortlist, `MatchScoreBadge` with fit/feasibility/evidence indicators, filter by cluster, selection CTA. |
| `/careers/:career_id` | `CareerDetailView` | Deep-dive pathway view with localized Indian entry routes, exam prerequisites, fee ranges in INR, and market trends. |
| `/compare` | `CareerComparisonView` | Side-by-side comparison table (prerequisites, duration, cost range, market demand caveats) for 3 pathways (FR-08). |
| `/roadmap` | `RoadmapView` | Interactive `RoadmapTimeline` partitioned into 7-day, 30-day, 90-day, and 180-day buckets, skill gap checklist, scholarship drawer. |
| `/guardian` | `ParentSummaryView` | Read-only plain-language summary, cost transparency card, shared discussion guide, conflict flags (FR-17). |
| `/counselor` | `CounselorQueueView` | Counselor triage table, frozen student snapshot inspector, override & notes modal (FR-15). |
| `/settings` | `ProfileSettingsView` | Profile details, guardian context view/edit, language selector, consent audit record, and account deletion flow (FR-20). |

#### Key Reusable UI Components
1. **`MatchScoreBadge` (`components/ui/MatchScoreBadge.tsx`):** Displays the transparent 3-label breakdown (Fit badge in `#1aae39` / `#dd5b00`, Feasibility indicator, Evidence Quality meter).
2. **`CareerCard` (`components/career/CareerCard.tsx`):** Displays canonical title, localized entry routes, estimated cost range in INR, risks/trade-offs, and primary/backup toggle.
3. **`RoadmapTimeline` (`components/roadmap/RoadmapTimeline.tsx`):** Vertical milestone sequence with milestone status icons, fallback action dropdowns, and free resource links.
4. **`ChatbotFAB & Drawer` (`components/chat/ChatbotDrawer.tsx`):** Floating Action Button tagged with decorative AI Accent (`#391c57`), opening a slide-over panel for grounded career Q&A with clear source citations and disclaimer.

---

## 4. Database Schema & Seed Data Ingestion

### 4.1 Storage Principles & Anti-Speculation Rules
- **RDBMS Engine:** PostgreSQL 16.x (Relational system of record with native `JSONB` support).
- **ORM & Migrations:** SQLAlchemy 2.0.x with Alembic 1.13.x.
- **Strict Anti-Speculation Rule:** No vector database (`pgvector`, ChromaDB, Pinecone) or live RAG/ETL streaming pipelines.
- **History Preservation & Reassessment:** Historical cycles are grouped under `recommendation_batches` and soft-superseded via `is_current = FALSE` and `superseded_at = NOW()`.
- **Safety Audit Retention Exception:** Per PRD Section 14, `counselor_escalations` with `trigger_reason = 'crisis_safety_flag'` and `chat_interactions` with `was_escalated = TRUE` use `ON DELETE SET NULL` at schema level and an application anonymization service to strip PII while preserving safety incident audit trails.

---

### 4.2 Complete PostgreSQL DDL Specification

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
CREATE TABLE recommendation_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    batch_number INT NOT NULL, -- 1 for initial onboarding, 2+ for reassessment cycles
    is_current BOOLEAN DEFAULT TRUE NOT NULL,
    superseded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_rec_batches_student_current ON recommendation_batches(student_id, is_current);

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
CREATE TABLE chat_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    career_ids_injected JSONB NOT NULL,
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

### 4.3 Seed Ingestion Logic & Dataset Mapping

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

1. **Naukri Job Title Matching:** Resolved via `/data/seed/mappings/naukri_title_to_career_map.json`. Unmapped titles are written to `unmapped_titles.log` for SME review.
2. **O*NET Skills Categorization & Normalization:**
   - Raw Scale: 1.0 to 5.0 Importance rating (`Scale ID: IM`).
   - Normalization Formula:
     $$\text{Standardized Score (0–100)} = \frac{\text{Raw Importance Score} - 1.0}{4.0} \times 100$$
   - Cutoffs:
     - `essential`: $\ge 70.0$ (Raw $\ge 3.80$)
     - `useful`: $50.0 \le \text{Score} < 70.0$ ($3.00 \le \text{Raw} < 3.80$)
     - `optional`: $< 50.0$ (Raw $< 3.00$)
3. **Scholar-Spot Scholarships Mapping:** Direct ingestion from CSV with whitespace trimming on headers, linking `LINKS` to `official_source_url` and attaching verification dates.

---

## 5. Data Models & Pydantic Specifications

### 5.1 Enums & Shared Value Objects

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

### 5.2 Pydantic Domain Entities

```python
# 1. Student Profile Model (FR-01, FR-02, FR-20)
class StudentProfile(BaseModel):
    id: str = Field(description="Unique UUID for student profile")
    user_id: str = Field(description="Foreign key to auth user")
    education_stage: EducationStage = Field(description="Current educational milestone")
    grade_or_year: str = Field(description="e.g. 'Class 10', 'Class 12', 'B.Tech 1st Year'")
    current_stream: Optional[str] = Field(None, description="e.g. 'Science PCM', 'Commerce', 'Arts', None for Class 8-10")
    interests: List[str] = Field(default_factory=list, description="Self-reported interest tags & RIASEC keywords")
    aptitude_signals: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Self-reported strengths, favorite subjects, non-mandatory academic bands"
    )
    work_style_preferences: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Preferences e.g. teamwork vs independent, practical vs theoretical"
    )
    budget_tier: BudgetTier = Field(default=BudgetTier.MODERATE_UP_TO_2L)
    relocation_willingness: RelocationWillingness = Field(default=RelocationWillingness.WITHIN_STATE)
    preferred_languages: List[str] = Field(default_factory=lambda: ["English", "Hindi"])
    consent_type: ConsentType = Field(description="guardian_consent_minor or self_consent_adult")
    consent_given_by: Optional[str] = Field(
        None, 
        description="Foreign key referencing guardian user_id. Nullable ONLY if student is verified adult (early_college)."
    )
    consent_recorded_at: datetime = Field(default_factory=datetime.utcnow, description="Immutable consent timestamp")
    academic_records_available: bool = Field(default=False, description="Flag indicating if formal marks were provided")
    profile_completeness_pct: int = Field(default=0, ge=0, le=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# 2. Guardian Context Model (FR-03, FR-17)
class GuardianContext(BaseModel):
    id: str = Field(description="Unique UUID for guardian context")
    student_id: str = Field(description="Foreign key to student profile")
    guardian_name: Optional[str] = None
    relationship_to_student: str = Field(description="e.g. 'Mother', 'Father', 'Guardian'")
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

# 3. Career Library & Entry Routes (FR-04, PRD 13.1)
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
    applicable_stages: List[EducationStage] = Field(description="Relevant student stages")
    job_zone: int = Field(ge=1, le=5, description="O*NET Job Zone (1=Little prep to 5=Extensive postgrad prep)")
    riasec_code: str = Field(description="Top Holland code combination, e.g. 'IRC'")
    riasec_scores: Dict[str, float] = Field(description="RIASEC scores: {'R': 1.2, 'I': 6.8, 'A': 2.1, 'S': 3.5, 'E': 4.2, 'C': 4.9}")
    india_entry_routes: List[IndiaEntryRoute] = Field(description="Structured Indian education & credential pathways")
    prerequisites: List[str] = Field(description="Mandatory 10th/12th subject requirements (e.g. 'Mathematics in 10+2')")
    risks_and_tradeoffs: List[str] = Field(description="Known risks, high drop-out rates, market saturation caveats")
    regional_caveats: Optional[str] = Field(None, description="Demand variations between Tier-1 tech hubs and other regions")
    content_owner: str = Field(description="Named SME / Counselor responsible for this record")
    review_cycle_months: int = Field(default=12, description="Mandatory review cycle in months")
    last_reviewed_date: date = Field(description="Date of latest editorial & factual verification")
    source_links: List[str] = Field(description="Official curriculum, regulatory, or research source URLs")

# 4. Career Skills (FR-11, FR-12, PRD 13.3)
class CareerSkill(BaseModel):
    id: str = Field(description="Unique UUID for skill entity")
    career_id: str = Field(description="Foreign key / slug referencing CareerLibrary")
    skill_name: str = Field(description="e.g. 'Python Programming', 'Statistical Inference', 'User Empathy'")
    category: SkillCategory = Field(description="Essential, Useful, or Optional per FR-11")
    description: str = Field(description="Contextual explanation of how this skill applies in the role")
    free_learning_resource_name: str = Field(description="e.g. 'NPTEL Python for Data Science (IIT Madras)'")
    free_learning_resource_url: str = Field(description="Direct URL to free public learning content")
    paid_learning_resource_name: Optional[str] = Field(None, description="Paid alternative (if any)")
    paid_learning_resource_url: Optional[str] = Field(None, description="URL to paid resource")
    commercial_disclosure: str = Field(
        default="Independent curated resource. No commercial commission or affiliation.",
        description="Mandatory conflict-of-interest disclosure per PRD 13.3"
    )

# 5. Scholarships (FR-13, PRD 13.4)
class Scholarship(BaseModel):
    id: int = Field(description="Primary key / ID from Scholar-Spot seed dataset")
    name: str = Field(description="Official name of the scholarship scheme")
    state: str = Field(description="State jurisdiction or 'All India'")
    sponsor_type: SponsorType = Field(description="Government or Private")
    target_category: str = Field(description="Caste / Social category: 'all', 'SC', 'ST', 'SEBC', 'EBC', 'open'")
    income_ceiling_inr: int = Field(description="Annual family income ceiling in INR; 0 indicates no limit")
    min_qualification: str = Field(description="Target qualification: 'FYJC', 'HSC', 'Graduation', 'Medical', 'SSC'")
    amount_description: str = Field(description="Allowance details, fee reimbursement, maintenance amounts")
    eligibility_summary: str = Field(description="Clear distilled eligibility rules")
    deadline_description: str = Field(description="Application cycle deadline")
    required_documents: List[str] = Field(
        default_factory=lambda: ["Income Certificate", "Caste Certificate (if applicable)", "Domicile Certificate", "Mark Sheet", "Aadhaar Card"]
    )
    official_source_url: str = Field(description="Official portal link")
    last_verified_date: date = Field(description="Date official portal was verified")
    renewal_conditions: Optional[str] = Field("Satisfactory academic progress in subsequent years")
    is_active: bool = Field(default=True)

# 6. Market Snapshot (FR-14, PRD 13.2)
class MarketSnapshot(BaseModel):
    id: str = Field(description="Unique UUID for market snapshot")
    career_id: str = Field(description="Foreign key referencing CareerLibrary.id")
    geography: str = Field(description="Regional scope")
    timeframe_period: str = Field(description="e.g. 'Sample of 47,193 Naukri job postings (2025-2026)'")
    data_source: str = Field(default="Naukri India Job Postings Sample")
    demand_indicator: DemandIndicator = Field(description="Categorical demand indicator")
    salary_range_entry_inr: str = Field(description="e.g. '₹4,00,000 - ₹7,50,000 / annum'")
    salary_range_mid_inr: str = Field(description="e.g. '₹10,00,000 - ₹20,00,000 / annum'")
    top_demanded_skills: List[str] = Field(description="Top skills extracted from postings")
    top_hiring_locations: List[str] = Field(description="Top locations")
    experience_distribution: Dict[str, str] = Field(description="Distribution breakdown")
    competition_caveat: str = Field(description="Mandatory competition caveat")
    uncertainty_statement: str = Field(description="Mandatory uncertainty statement")
    last_updated_date: date = Field(description="Date snapshot was generated")

# 7. Recommendation Batches & Recommendations (FR-05, FR-06, FR-07, FR-09, FR-18)
class RecommendationBatch(BaseModel):
    id: str = Field(description="Unique UUID for recommendation batch")
    student_id: str = Field(description="Foreign key referencing StudentProfile.id")
    batch_number: int = Field(default=1, ge=1, description="1 for onboarding, 2+ for reassessment cycles")
    is_current: bool = Field(default=True)
    superseded_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Recommendation(BaseModel):
    id: str = Field(description="Unique UUID for recommendation entry")
    batch_id: str = Field(description="Foreign key referencing RecommendationBatch.id")
    student_id: str = Field(description="Foreign key referencing StudentProfile.id")
    career_id: str = Field(description="Foreign key referencing CareerLibrary.id")
    career_title: str = Field(description="Display title for quick serialization")
    rank_position: int = Field(ge=1, le=5, description="Rank position (1 to 5) in shortlist")
    composite_score: float = Field(ge=0.0, le=100.0, description="Overall weighted score")
    fit_score: float = Field(ge=0.0, le=100.0, description="Interest & aptitude alignment score")
    feasibility_score: float = Field(ge=0.0, le=100.0, description="Budget, location, and entry-route realism score")
    evidence_quality_score: float = Field(ge=0.0, le=100.0, description="Completeness of student profile inputs")
    fit_label: FitLabel = Field(description="Strong, Moderate, Emerging, Insufficient evidence")
    feasibility_label: FeasibilityLabel = Field(description="High, Moderate, Challenging, Low")
    evidence_quality_label: EvidenceQualityLabel = Field(description="High, Moderate, Preliminary, Sparse")
    reasons: List[str] = Field(description="Itemized match reasons")
    concerns: List[str] = Field(description="Itemized constraints/trade-offs")
    missing_evidence_flags: List[str] = Field(description="Data gaps")
    is_primary_selection: bool = Field(default=False)
    is_backup_selection: bool = Field(default=False)
    is_current: bool = Field(default=True)
    superseded_at: Optional[datetime] = Field(None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 8. Roadmap & Milestones (FR-10, FR-11, FR-12, FR-18)
class RoadmapMilestone(BaseModel):
    id: str = Field(description="Unique UUID for milestone")
    roadmap_id: str = Field(description="Foreign key referencing Roadmap.id")
    timeframe_bucket: TimeframeBucket = Field(description="next_7_days, day_30, day_90, or day_180")
    order_index: int = Field(ge=1)
    title: str = Field(description="Actionable milestone title")
    description: str = Field(description="Detailed instructions and expected output")
    milestone_type: MilestoneType = Field(description="Milestone classification")
    prerequisites: List[str] = Field(default_factory=list)
    estimated_cost_inr: int = Field(default=0)
    is_low_cost_or_free: bool = Field(default=True)
    free_resource_url: Optional[str] = Field(None)
    completion_evidence_type: EvidenceType = Field(default=EvidenceType.SELF_REPORT)
    completion_evidence_note_or_url: Optional[str] = Field(None)
    is_completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    fallback_action: str = Field(description="Alternative step if blocked")

class Roadmap(BaseModel):
    id: str = Field(description="Unique UUID for roadmap")
    student_id: str = Field(description="Foreign key referencing StudentProfile.id")
    primary_career_id: str = Field(description="Foreign key referencing primary CareerLibrary.id")
    backup_career_id: Optional[str] = Field(None, description="Foreign key referencing backup CareerLibrary.id")
    status: str = Field(default="active")
    is_current: bool = Field(default=True)
    superseded_at: Optional[datetime] = Field(None)
    milestones: List[RoadmapMilestone] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# 9. Parent Summary Model (FR-17)
class ParentSummary(BaseModel):
    id: str = Field(description="Unique UUID for parent summary")
    student_id: str = Field(description="Foreign key referencing StudentProfile.id")
    recommendation_batch_id: str = Field(description="Foreign key referencing RecommendationBatch.id")
    summary_text: str = Field(description="Plain-language breakdown of paths, costs, risks, and next steps")
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# 10. Chat Interaction Audit Model (FR-16)
class ChatInteraction(BaseModel):
    id: str = Field(description="Unique UUID for chat interaction")
    student_id: Optional[str] = Field(None, description="NULL if account was erased (retained for safety audit)")
    question_text: str = Field(description="Raw student query text")
    career_ids_injected: List[str] = Field(description="Slugs injected into system prompt")
    answer_text: str = Field(description="LLM response")
    was_escalated: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 11. Counselor Escalation Model (FR-15, PRD Section 14)
class CounselorEscalation(BaseModel):
    id: str = Field(description="Unique UUID for escalation ticket")
    student_id: Optional[str] = Field(None, description="NULL if account was erased (retained for safety audit)")
    trigger_reason: EscalationTrigger = Field(description="Trigger category")
    status: EscalationStatus = Field(default=EscalationStatus.PENDING)
    student_summary_snapshot: Dict[str, Any] = Field(description="Frozen JSON snapshot")
    counselor_user_id: Optional[str] = Field(None)
    counselor_notes: Optional[str] = Field(None)
    counselor_override_decision: Optional[str] = Field(None)
    counselor_override_rationale: Optional[str] = Field(None)
    scheduled_at: Optional[datetime] = Field(None)
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## 6. RESTful API Specification & Contracts

### 6.1 API Conventions
- **Base URL:** `/api/v1`
- **Protocol:** HTTPS with JWT Bearer Authentication (`Authorization: Bearer <token>`)
- **Documentation:** OpenAPI 3.1 schema auto-generated at `/docs`.

---

### 6.2 Endpoints Specification

#### 1. Authentication & Minor Consent Endpoints (FR-20)
- `POST /api/v1/auth/register`
  - Registers user account (`student`, `guardian`, `counselor`, `admin`).
- `POST /api/v1/auth/minor-consent`
  - Body: `{ "student_profile_id": "...", "consent_type": "guardian_consent_minor", "guardian_email": "...", "guardian_phone": "...", "guardian_signature_confirmed": true }`
  - Response: `{ "status": "consent_recorded", "consent_recorded_at": "...", "guardian_user_id": "..." }`

#### 2. Profile & Onboarding Endpoints (FR-01, FR-02, FR-03)
- `POST /api/v1/profile`
  - Creates or updates student context (`education_stage`, `interests`, `aptitude_signals`, `budget_tier`, `relocation_willingness`).
  - Returns serialized `StudentProfile` with `profile_completeness_pct`.
- `POST /api/v1/profile/guardian`
  - Submits guardian priorities, financial ceiling in INR, relocation limits, and notes.

#### 3. Career Library & Comparison Endpoints (FR-04, FR-08, FR-11, FR-14)
- `GET /api/v1/careers/{career_id}`
  - Returns canonical career object, entry routes, skills, market snapshot, governance metadata, and source links.
- `POST /api/v1/careers/compare`
  - Body: `{ "career_ids": ["data-scientist", "software-engineer", "data-analyst"] }`
  - Returns side-by-side matrix of durations, cost tiers, prerequisites, and demand caveats.

#### 4. Recommendations & Decision Endpoints (FR-05, FR-06, FR-07, FR-09)
- `POST /api/v1/recommendations/evaluate`
  - Executes deterministic weighted-sum scoring algorithm.
  - Returns `RecommendationBatch` with ranked list, composite/fit/feasibility/evidence scores, 3 categorical labels, reasons, concerns, and missing evidence flags.
- `POST /api/v1/recommendations/select-pathways`
  - Body: `{ "batch_id": "...", "primary_career_id": "data-scientist", "backup_career_id": "data-analyst", "decision_notes": "..." }`
  - Initializes active `Roadmap`.

#### 5. Roadmap & Execution Endpoints (FR-10, FR-11, FR-12)
- `GET /api/v1/roadmap`
  - Retrieves active adaptive roadmap with 7-day, 30-day, 90-day, and 180-day milestone buckets.
- `PATCH /api/v1/roadmap/milestones/{milestone_id}/complete`
  - Body: `{ "completion_evidence_type": "project_artifact", "completion_evidence_note_or_url": "https://github.com/..." }`
  - Marks milestone completed and unlocks downstream dependencies.

#### 6. Scholarship Endpoints (FR-13) - Seeded from Scholar-Spot
- `GET /api/v1/scholarships`
  - Query parameters: `state`, `target_category`, `min_qualification`, `income_ceiling_inr`, `limit`, `offset`.
  - Returns filtered list of verified government and private scholarships.
- `GET /api/v1/scholarships/{id}`
  - Retrieves detailed scholarship record with official source link and verification dates.

#### 7. Grounded Career Q&A Chatbot Endpoint (FR-16)
- `POST /api/v1/chat/message`
  - Body: `{ "question_text": "What is the entrance exam and typical fee for Data Science in Maharashtra?" }`
  - Returns `{ "interaction_id": "...", "answer_text": "...", "citations": [...], "career_ids_injected": [...], "was_escalated": false }`

#### 8. Guardian & Parent Summary Endpoint (FR-17)
- `GET /api/v1/guardian/summary`
  - Returns persisted plain-language summary for the active recommendation batch.

#### 9. Counselor Escalation Endpoints (FR-15, PRD Section 14)
- `POST /api/v1/escalations/trigger`
  - Body: `{ "trigger_reason": "student_parent_deadlock", "notes": "..." }`
  - Creates pending `CounselorEscalation` ticket with frozen student context snapshot.
- `POST /api/v1/counselor/review/{escalation_id}`
  - Counselor reviews ticket and submits notes and override decision with mandatory rationale.

---

## 7. Core Workflows & Recommendation Engine Logic

### 7.1 Deterministic Scoring Engine Workflow (FR-05, FR-06, FR-07)

```mermaid
flowchart TD
    Profile[Student Profile + Constraints] --> FetchCatalog[Fetch Career Library Catalog]
    FetchCatalog --> LoopCareers[Iterate Over Career Entries]
    
    subgraph ScoringEngine ["Deterministic Scoring Engine (Plain Python)"]
        LoopCareers --> CalcFit[Calculate Fit Score: RIASEC + Aptitude Match]
        LoopCareers --> CalcFeas[Calculate Feasibility Score: Budget + Location + Stage]
        LoopCareers --> CalcEvid[Calculate Evidence Quality Score: Completeness]
        
        CalcFit & CalcFeas & CalcEvid --> CalcComposite[Composite Score = 0.55*Fit + 0.45*Feasibility - 0.10*(100-Evidence)]
        CalcComposite --> DeriveLabels[Derive Fit, Feasibility, & Evidence Labels]
        DeriveLabels --> GenerateExplain[Generate Reasons, Concerns, Missing Flags]
    end

    GenerateExplain --> RankTop[Rank & Select Top 3-5 Pathways]
    RankTop --> CreateBatch[Save to DB in new RecommendationBatch]
    CreateBatch --> TriggerParentSummary[Trigger Parent Summary Generator LLM Call]
```

#### Mathematical Formulation
For each career $c \in \text{CareerLibrary}$ against student profile $s \in \text{StudentProfile}$:

1. **Personal Fit Score ($\text{Fit}(s, c) \in [0, 100]$):**
   $$\text{Fit}(s, c) = 0.60 \cdot \text{RIASEC\_Alignment}(s, c) + 0.40 \cdot \text{Aptitude\_Signal\_Match}(s, c)$$
   - $\text{RIASEC\_Alignment}(s, c)$: Dot-product similarity between normalized student interest vectors and career Holland scores.
   - $\text{Aptitude\_Signal\_Match}(s, c)$: Overlap between student-reported favorite subjects / self-reported strengths and career prerequisite domains.

2. **Practical Feasibility Score ($\text{Feas}(s, c) \in [0, 100]$):**
   $$\text{Feas}(s, c) = 0.45 \cdot \text{Budget\_Compatibility}(s, c) + 0.35 \cdot \text{Relocation\_Fit}(s, c) + 0.20 \cdot \text{Stage\_Eligibility}(s, c)$$
   - $\text{Budget\_Compatibility}$: 100 if entry route cost $\le$ family budget ceiling; penalized proportionally if cost exceeds budget unless high-value scholarships exist.
   - $\text{Relocation\_Fit}$: 100 if education/jobs exist within `relocation_willingness`; 40 if career requires relocation beyond student's allowed boundary.
   - $\text{Stage\_Eligibility}$: 100 if student's `education_stage` and stream satisfy career prerequisites; 50 if bridge/remedial courses are required.

3. **Evidence Quality Score ($\text{Evid}(s) \in [0, 100]$):**
   $$\text{Evid}(s) = 0.70 \cdot \text{profile\_completeness\_pct} + 0.30 \cdot (100 \text{ if } \text{academic\_records\_available} \text{ else } 40)$$

4. **Composite Score ($\text{Composite}(s, c) \in [0, 100]$):**
   $$\text{Composite}(s, c) = \max\Big(0.0, \, 0.55 \cdot \text{Fit}(s, c) + 0.45 \cdot \text{Feas}(s, c) - 0.10 \cdot (100 - \text{Evid}(s))\Big)$$

---

### 7.2 Categorical Label Assignment Rules (FR-07)

| Metric | Score Range | Label Assigned | Communicated Meaning |
|---|---|---|---|
| **Fit Evidence** | $\ge 75.0$ | **`Strong`** | High alignment across interests and stated strengths. |
| | $55.0 - 74.9$ | **`Moderate`** | Notable interest overlap; some skill areas unexplored. |
| | $35.0 - 54.9$ | **`Emerging`** | Nascent interest or partial subject alignment. |
| | $< 35.0$ | **`Insufficient evidence`** | Profile does not provide clear alignment signals. |
| **Feasibility** | $\ge 75.0$ | **`High`** | Direct low-cost entry routes exist locally. |
| | $50.0 - 74.9$ | **`Moderate`** | Realistic with moderate budget or standard exams. |
| | $30.0 - 49.9$ | **`Challenging`** | High cost, strict entrance filters, or relocation needed. |
| | $< 30.0$ | **`Low`** | Severe budget/prerequisite constraints identified. |
| **Evidence Quality** | $\ge 80.0$ | **`High`** | Full profile with academic records and validated signals. |
| | $50.0 - 79.9$ | **`Moderate`** | Standard questionnaire completed; records unverified. |
| | $30.0 - 49.9$ | **`Preliminary`** | Partial questionnaire answers; exploratory state. |
| | $< 30.0$ | **`Sparse`** | Critical constraint/interest fields missing. |

---

### 7.3 Grounded Career Q&A Chatbot Workflow (FR-16)

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as Frontend Chatbot Drawer
    participant API as FastAPI Chatbot Router
    participant DB as PostgreSQL 16
    participant LLM as Anthropic Claude API

    Student->>UI: Types career question (e.g. "What exams are needed for Data Science in India?")
    UI->>API: POST /api/v1/chat/message {question_text}
    
    API->>API: Safety Filter: Check for crisis/distress keywords
    alt Crisis Detected
        API->>DB: Log Escalation Ticket (CRISIS_SAFETY_FLAG)
        API-->>UI: Return Emergency Helpline + Stop Career Advice
    else Standard Query
        API->>DB: Query career_library records matching keywords/clusters
        DB-->>API: Return matched structured career JSONs
        
        API->>API: Assemble system prompt with negative grounding constraint + injected JSON
        API->>LLM: Single-turn POST /v1/messages (System prompt + context + student question)
        LLM-->>API: Grounded response with source citations
        
        API->>DB: INSERT INTO chat_interactions (student_id, question, career_ids_injected, answer, was_escalated)
        API-->>UI: Return {answer_text, citations, injected_career_ids}
        UI-->>Student: Render answer with approved source badges
    end
```

#### System Prompt Template for Chatbot:
```
You are the Career Information Assistant for Next_Path. You provide factual, encouraging, and transparent guidance to Indian students.

STRICT OPERATIONAL BOUNDARIES:
1. You may ONLY use the verified career records provided below inside <approved_career_context>.
2. If the user asks about an exam, cost, duration, or prerequisite NOT present in the approved context, you MUST state: "I do not have verified information on that in our current database. Please consult a school counselor or official portal."
3. NEVER guarantee job placement, admissions, or future salary outcomes.
4. Always highlight low-cost or public alternative routes where available in the context.

<approved_career_context>
{injected_career_json_data}
</approved_career_context>
```

---

### 7.4 Parent Summary Generation Workflow (FR-17)

```mermaid
sequenceDiagram
    autonumber
    participant Engine as Recommendation Engine
    participant API as Parent Summary Service
    participant LLM as Anthropic Claude API
    participant DB as PostgreSQL 16
    actor Guardian

    Engine->>API: generate_parent_summary(student_id, batch_id)
    API->>DB: Fetch RecommendationBatch + top 3 Careers + GuardianContext
    DB-->>API: Return structured data snapshot
    
    API->>API: Build deterministic structured input payload
    API->>LLM: Single-turn POST /v1/messages (Translate options into plain-language Hindi/English overview)
    LLM-->>API: Return plain-language 1-2 paragraph summary with cost/risk trade-offs
    
    API->>DB: INSERT INTO parent_summaries (student_id, recommendation_batch_id, summary_text)
    
    Guardian->>DB: GET /api/v1/guardian/summary (View summary)
    DB-->>Guardian: Return persisted ParentSummary (No regeneration)
```

---

### 7.5 Reassessment & Historical Preservation Workflow (FR-18)

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant API as Reassessment Controller
    participant Engine as Scoring Engine
    participant DB as PostgreSQL 16

    Student->>API: POST /api/v1/reassess/trigger {updated_interests, new_constraints}
    API->>DB: Fetch previous active batch (is_current = TRUE)
    
    critical Atomic Database Transaction
        API->>DB: UPDATE recommendation_batches SET is_current = FALSE, superseded_at = NOW() WHERE student_id = :id AND is_current = TRUE
        API->>DB: UPDATE recommendations SET is_current = FALSE, superseded_at = NOW() WHERE student_id = :id AND is_current = TRUE
        API->>DB: UPDATE roadmaps SET is_current = FALSE, superseded_at = NOW() WHERE student_id = :id AND is_current = TRUE
        
        API->>Engine: Run Scoring Engine on updated profile
        Engine-->>API: Return new Top 3-5 Ranked Recommendations
        
        API->>DB: INSERT INTO recommendation_batches (student_id, batch_number, is_current) VALUES (...)
        API->>DB: INSERT INTO recommendations (batch_id, ..., is_current=TRUE) VALUES (...)
        API->>DB: INSERT INTO roadmaps (student_id, ..., is_current=TRUE) VALUES (...)
        Note over DB: Prior roadmap milestones are preserved, linked to old roadmap_id
    end

    API-->>Student: Return updated recommendations with "Changes since last review" comparison
```

---

## 8. Security, Privacy & Minor Governance

### 8.1 Defense-in-Depth Security Baseline

```mermaid
graph TD
    subgraph Perimeter ["1. Network Perimeter & Transport Security"]
        TLS["HTTPS / TLS 1.3 Everywhere"]
        CORS["Strict CORS Whitelist (app.nextpath.in)"]
        RateLimit["FastAPI Rate Limiting (100 req/min/IP)"]
    end

    subgraph AppLayer ["2. Application Security & RBAC"]
        JWT["JWT Auth (HS256 + 24h Expiry)"]
        RBAC["Role-Based Access Control (Student / Guardian / Counselor / Admin)"]
        Consent["Minor Consent Gatekeeper (FR-20)"]
    end

    subgraph DataLayer ["3. Database & Storage Protection"]
        TDE["Managed Postgres Storage Encryption (AES-256 At-Rest)"]
        Isolation["Tenant & User ID Scoped SQL Queries"]
        Audit["Immutable Audit Logging (chat_interactions, counselor_escalations)"]
    end

    subgraph Safety ["4. AI & Minor Safety Guardrails"]
        CrisisFilter["Emergency Crisis & Self-Harm Interceptor (PRD Sec 14)"]
        PromptGrounding["Strict Negative Grounding (FR-16)"]
    end

    Perimeter --> AppLayer
    AppLayer --> DataLayer
    AppLayer --> Safety
```

---

### 8.2 Minor Consent & Privacy Architecture (FR-20, PRD Section 16)
1. **Mandatory Guardian Consent Gate:** No student account in `class_8_10` or `class_11_12` can finalize onboarding without verified guardian consent (`consent_type = 'guardian_consent_minor'`).
2. **Data Minimization:** Academic marks are non-mandatory (FR-02). Social category (SC/ST/OBC/EBC) and annual income are captured exclusively for scholarship filtering (FR-13).
3. **No Commercial Data Brokerage:** Student data is never sold, shared with advertisers, or used for college recruitment commissions (PRD Section 18.4).

---

### 8.3 Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | Student | Guardian | Counselor | Admin |
|---|---|---|---|---|
| `/api/v1/profile` | Read / Write (Own) | Read-Only (Child) | Read (Assigned) | Read / Write |
| `/api/v1/profile/guardian` | Read-Only (Child view) | Read / Write (Own) | Read (Assigned) | Read / Write |
| `/api/v1/recommendations/*` | Read (Own active) | Read (Child active) | Read / Evaluate | Read / Write |
| `/api/v1/guardian/summary` | Read | Read (Child summary) | Read | Read |
| `/api/v1/counselor/queue` | ❌ Forbidden | ❌ Forbidden | Read / Review | Full Access |
| `/api/v1/counselor/review/*` | ❌ Forbidden | ❌ Forbidden | Read / Write Override | Full Access |
| `/api/v1/chat/message` | Read / Write (Own) | ❌ Forbidden | ❌ Forbidden | Audit Read |

---

### 8.4 Emergency Crisis & Self-Harm Safety Circuit (PRD Section 14)
If a student message contains indicators of extreme distress, depression, or self-harm:
1. **Immediate Advice Halt:** Career guidance is instantly suspended.
2. **Safe Response:** System displays empathetic supportive copy and national crisis helpline contacts (Tele-MANAS, KIRAN 1800-599-0019).
3. **Automated Counselor Escalation:** High-priority ticket with `trigger_reason = 'crisis_safety_flag'` is automatically logged in `counselor_escalations`.

---

### 8.5 Data Rights, Erasure & Safety Retention Exception
- **Standard Erasure:** Student profile, guardian contexts, roadmaps, recommendations, and standard chat logs are deleted via cascading SQL deletion.
- **Safety Audit Retention Exception:** Rows in `counselor_escalations` with `trigger_reason = 'crisis_safety_flag'` and `chat_interactions` with `was_escalated = TRUE` are retained with `student_id = NULL` (via `ON DELETE SET NULL`), scrubbing PII while preserving legal proof of duty-of-care escalation.

---

## 9. Deployment, Infrastructure & DevOps

### 9.1 Infrastructure Topology Matrix

```mermaid
graph LR
    subgraph Client ["Client Devices"]
        Browser["Student / Guardian Mobile Browser (PWA)"]
    end

    subgraph CDN ["Frontend Hosting (Vercel / Netlify)"]
        Edge["Global Edge CDN (HTTPS TLS 1.3)"]
        SPA["Vite Static Build + Service Worker"]
    end

    subgraph Backend_Platform ["Backend Hosting (Render / Railway)"]
        FastAPI_App["FastAPI Container (Uvicorn 4 Workers)"]
    end

    subgraph DB_Platform ["Managed Database (Supabase / Render Postgres)"]
        PostgresDB[("PostgreSQL 16 Engine + Automated Backups")]
    end

    subgraph LLM_Cloud ["External LLM Cloud"]
        ClaudeAPI["Anthropic Messages API"]
    end

    Browser --> Edge
    Edge --> SPA
    Browser -->|API Requests /api/v1/*| FastAPI_App
    FastAPI_App -->|Async SQLAlchemy Pool| PostgresDB
    FastAPI_App -->|Single-Turn HTTPS| ClaudeAPI
```

| Tier | Hosting Platform | Runtime / Config | Purpose |
|---|---|---|---|
| **Frontend** | **Vercel** or **Netlify** | Node.js 20 build $\rightarrow$ Static SPA output | Hosts React 18 SPA, static assets, and PWA service worker. |
| **Backend API** | **Render** or **Railway** | Docker container (Python 3.12-slim + Uvicorn) | Executes FastAPI REST API, scoring engine, and LLM integrations. |
| **Database** | **Managed PostgreSQL (Supabase / Render)** | PostgreSQL 16.x (1 Primary, automated daily snapshots) | System of record for all profiles, catalog, recommendations, and audit logs. |
| **LLM Provider** | **Anthropic API** | Claude Messages API (HTTPS) | Powers single-turn Career Q&A (FR-16) and Parent Summary generation (FR-17). |

---

### 9.2 Environment Configuration

```bash
# BACKEND (.env)
ENVIRONMENT=production
DEBUG=false
PROJECT_NAME="Next_Path AI Career Companion"
API_V1_STR="/api/v1"
DATABASE_URL=postgresql+asyncpg://nextpath_user:SecurePassword@db.host.render.com:5432/nextpath_prod
JWT_SECRET_KEY=e83a9f01b3d7c58e4129ab819023485712903487192834710923847102938471
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=<current-stable-model-see-tech-stack.md>
BACKEND_CORS_ORIGINS=["https://app.nextpath.in", "https://nextpath.vercel.app"]

# FRONTEND (.env.production)
VITE_API_BASE_URL=https://api.nextpath.in/api/v1
VITE_APP_VERSION=1.0.0
```

---

### 9.3 Local Development Environment (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: nextpath_postgres
    environment:
      POSTGRES_USER: nextpath_user
      POSTGRES_PASSWORD: local_dev_password
      POSTGRES_DB: nextpath_local
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: nextpath_backend
    environment:
      DATABASE_URL: postgresql+asyncpg://nextpath_user:local_dev_password@postgres:5432/nextpath_local
      JWT_SECRET_KEY: local_dev_secret_key_1234567890
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - ./data:/data
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: nextpath_frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 10. Coding Standards & Engineering Conventions

### 10.1 Backend Standards (Python 3.12 / FastAPI / Pydantic v2)
1. **Linting & Types:** `ruff` (100 char line limit) and strict `mypy` type annotations on all function signatures.
2. **Pydantic v2 Idioms:** `model_config = ConfigDict(from_attributes=True, extra="forbid")`. Mandatory PRD Section 13 governance fields must never be `Optional`.
3. **Pure Scoring Engine:** Deterministic plain Python functions with zero external network or ML dependencies.
4. **Async & Dependency Injection:** All database operations and API calls use `async`/`await` and FastAPI `Depends()`.

```python
# Example: FastAPI Dependency & Endpoint Pattern
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.schemas.recommendation import RecommendationBatchResponse
from app.modules.scoring_engine import calculate_career_recommendations

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post("/evaluate", response_model=RecommendationBatchResponse, status_code=status.HTTP_200_OK)
async def evaluate_profile(
    current_student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db)
) -> RecommendationBatchResponse:
    if current_student.profile_completeness_pct < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student profile must be at least 50% complete before running evaluation."
        )
    return await calculate_career_recommendations(current_student.id, db)
```

---

### 10.2 Frontend Standards (React 18 / TypeScript / Tailwind CSS)
1. **Strict TypeScript:** `"strict": true`, `"noImplicitAny": true`, zero `any` usage.
2. **Server State via TanStack Query:** All remote data fetched via `useQuery`/`useMutation` hooks with granular cache key invalidation.
3. **Form Handling:** `react-hook-form` paired with `@hookform/resolvers/zod`.
4. **Design System v6 Tokens:** Use only design tokens defined in `AI_Career_Guidance_Design_System-6.md` (`bg-primary`, `bg-canvas-soft`, `bg-surface`, `text-ink`, `bg-ai-accent`).

---

### 10.3 Testing Quality Gates

| Layer | Framework | Minimum Standard | Target Areas |
|---|---|---|---|
| **Backend Unit Tests** | `pytest` | 80%+ coverage on core logic | `scoring_engine.py`, cutoff threshold assignments, validation schemas. |
| **Backend API Tests** | `pytest` + `httpx.AsyncClient` | 100% endpoint pass rate | Auth flows, minor consent validation, career lookup, error responses. |
| **Frontend Unit Tests** | `vitest` + React Testing Library | Key component rendering | `MatchScoreBadge.tsx`, `RoadmapTimeline.tsx`, `CareerCard.tsx`. |
| **CI Automation** | GitHub Actions | Block merge on lint/test failure | `ruff check`, `mypy`, `pytest`, `npm run typecheck`, `vitest run`. |

---

## 11. Repository Source Tree & Project Layout

```
Next_Path/
├── .github/                      # GitHub Actions CI workflows (lint, test)
│
├── backend/                      # Python 3.12 / FastAPI Backend Application
│   ├── app/
│   │   ├── core/                 # Core system configuration & security
│   │   │   ├── config.py         # Pydantic BaseSettings (DB URL, JWT Secret, Anthropic API Key)
│   │   │   ├── database.py       # SQLAlchemy 2.0 async engine & sessionmaker
│   │   │   ├── security.py       # JWT encoding/decoding, bcrypt password hashing
│   │   │   └── dependencies.py   # FastAPI dependency injection (get_db, get_current_user, get_counselor)
│   │   │
│   │   ├── models/               # SQLAlchemy 2.0 ORM Declarative Models
│   │   │   ├── __init__.py
│   │   │   ├── user.py           # User table
│   │   │   ├── profile.py        # StudentProfile & GuardianContext tables
│   │   │   ├── catalog.py        # CareerLibrary, CareerSkill, Scholarship, MarketSnapshot
│   │   │   ├── recommendation.py # RecommendationBatch, Recommendation, ParentSummary
│   │   │   ├── roadmap.py        # Roadmap & RoadmapMilestone tables
│   │   │   ├── chat.py           # ChatInteraction audit table
│   │   │   └── escalation.py     # CounselorEscalation table
│   │   │
│   │   ├── schemas/              # Pydantic v2 Domain & DTO Validation Schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # Token, LoginRequest, RegisterRequest, MinorConsentRequest
│   │   │   ├── profile.py        # StudentProfileCreate, StudentProfileResponse, GuardianContextDTO
│   │   │   ├── catalog.py        # CareerDetailDTO, CareerSkillDTO, ScholarshipDTO, MarketSnapshotDTO
│   │   │   ├── recommendation.py # RecommendationBatchResponse, RecommendationDTO, PathwaySelectRequest
│   │   │   ├── roadmap.py        # RoadmapResponse, MilestoneCompleteRequest
│   │   │   ├── chat.py           # ChatMessageRequest, ChatMessageResponse
│   │   │   ├── parent_summary.py # ParentSummaryResponse
│   │   │   └── escalation.py     # EscalationCreateRequest, EscalationReviewRequest
│   │   │
│   │   ├── modules/              # Business Logic & Service Boundary Layer
│   │   │   ├── auth_service.py   # Auth logic & minor consent verification
│   │   │   ├── scoring_engine.py # Deterministic plain-Python weighted-sum algorithm
│   │   │   ├── roadmap_service.py# Adaptive milestone builder & fallback generator
│   │   │   ├── llm_client.py     # Anthropic Claude Messages client (single-turn API wrapper)
│   │   │   ├── chatbot_service.py# Grounded Q&A prompt assembler & crisis filter
│   │   │   ├── parent_summary_service.py # Plain-language guardian summary generator
│   │   │   └── escalation_service.py # Automated trigger rules & triage routing
│   │   │
│   │   ├── api/                  # FastAPI Route Controllers
│   │   │   ├── __init__.py
│   │   │   ├── router.py         # Main APIRouter aggregating all module endpoints
│   │   │   └── v1/
│   │   │       ├── auth.py       # /api/v1/auth/*
│   │   │       ├── profile.py    # /api/v1/profile/*
│   │   │       ├── careers.py    # /api/v1/careers/*
│   │   │       ├── recommendations.py # /api/v1/recommendations/*
│   │   │       ├── roadmap.py    # /api/v1/roadmap/*
│   │   │       ├── scholarships.py# /api/v1/scholarships/*
│   │   │       ├── chat.py       # /api/v1/chat/*
│   │   │       ├── guardian.py   # /api/v1/guardian/*
│   │   │       └── counselor.py  # /api/v1/counselor/*
│   │   │
│   │   ├── main.py               # FastAPI Application Factory & Middleware setup
│   │   └── alembic/              # Database Migration Scripts
│   │       ├── env.py
│   │       ├── script.py.mako
│   │       └── versions/
│   │
│   ├── data/
│   │   └── seed_runner.py        # CLI seed ingestion script: python -m backend.data.seed_runner
│   │
│   ├── tests/                    # Backend Pytest Test Suite
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_scoring_engine.py
│   │   ├── test_chatbot_grounding.py
│   │   └── test_api_endpoints.py
│   │
│   ├── Dockerfile                # Python 3.12-slim container configuration
│   ├── pyproject.toml            # Dependencies & tool configurations (ruff, pytest)
│   └── requirements.txt          # Pinned pip dependencies matching tech-stack.md
│
├── frontend/                     # React 18 / TypeScript / Vite Frontend Application
│   ├── public/                   # Static public assets & PWA icons
│   │   ├── favicon.ico
│   │   ├── manifest.json         # PWA web manifest
│   │   └── robots.txt
│   │
│   ├── src/
│   │   ├── assets/               # SVG icons & decorative illustration assets
│   │   ├── components/           # Reusable UI Component Library
│   │   │   ├── ui/               # Primitive Design System v6 Elements (Button, Card, Badge, MatchScoreBadge)
│   │   │   ├── layout/           # AppHeader, AppLayout, Footer
│   │   │   ├── career/           # CareerCard, ComparisonTable, SkillList
│   │   │   ├── roadmap/          # RoadmapTimeline, MilestoneCard, FallbackDropdown
│   │   │   └── chat/             # ChatbotFAB, ChatbotDrawer
│   │   │
│   │   ├── views/                # OnboardingWizard, ResultsDashboard, CareerDetailView, RoadmapView, etc.
│   │   ├── hooks/                # useAuth, useRecommendations, useRoadmap, useChatbot
│   │   ├── services/             # api_client.ts, endpoints.ts
│   │   ├── types/                # models.ts (mirrored Pydantic schemas), forms.ts (Zod)
│   │   ├── App.tsx               # React Router 6 route tree
│   │   ├── main.tsx              # Entry point with TanStack Query provider
│   │   └── index.css             # Tailwind CSS directives & Design System v6 font imports
│   │
│   ├── index.html
│   ├── tailwind.config.js        # Tailwind token mappings
│   ├── tsconfig.json             # TypeScript 5.6 configuration
│   ├── vite.config.ts            # Vite 5.4 build configuration + vite-plugin-pwa
│   ├── package.json              # Pinned dependencies matching tech-stack.md
│   └── Dockerfile                # Multi-stage Nginx build for static SPA
│
├── data/                         # Seed data & deterministic mapping dictionaries
│   └── seed/
│       ├── mappings/
│       │   ├── naukri_title_to_career_map.json # Manual SME mapping: Job_Titles -> career_library.id
│       │   └── onet_skill_tier_overrides.json   # Content owner curriculum overrides for skill tiers
│       ├── seed_scholarships.csv                # Scholar-Spot Indian scholarships CSV
│       ├── seed_market_snapshots.csv            # Sourced & aggregated from Naukri India postings
│       ├── seed_career_clusters.json            # Localized O*NET occupational catalogue with Indian routes
│       └── seed_runner.py                       # CLI seed runner script with database transaction safety
│
├── docs/                         # Specifications & Sharded Architecture
│   ├── architecture/             # Sharded Architecture Documentation
│   │   ├── full_architecture.md  # Single Consolidated Architecture Document
│   │   ├── introduction.md
│   │   ├── tech-stack.md
│   │   ├── components.md
│   │   ├── database-schema.md
│   │   ├── data-models.md
│   │   ├── api-specification.md
│   │   ├── core-workflows.md
│   │   ├── security-and-privacy.md
│   │   ├── deployment-and-infrastructure.md
│   │   ├── coding-standards.md
│   │   └── source-tree.md
│   ├── Refined_PRD_AI_Career_Guidance.md # Source PRD v2.0
│   └── AI_Career_Guidance_Design_System-6.md # UI Tokens & Design System v6
│
├── docker-compose.yml            # Local dev environment (Postgres 16 + Backend + Frontend)
├── .env.example                  # Environment variable template
├── .gitignore                    # Standard Python/Node/IDE ignore rules
└── README.md                     # Project overview & quick-start guide
```
