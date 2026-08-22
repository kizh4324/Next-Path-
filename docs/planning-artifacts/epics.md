---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - docs/Refined_PRD_AI_Career_Guidance.md
  - docs/AI_Career_Guidance_Design_System-6.md
  - docs/architecture/tech-stack.md
  - docs/architecture/introduction.md
  - docs/architecture/data-models.md
  - docs/architecture/database-schema.md
  - docs/architecture/components.md
  - docs/architecture/core-workflows.md
  - docs/architecture/api-specification.md
  - docs/architecture/source-tree.md
  - docs/architecture/coding-standards.md
  - docs/architecture/deployment-and-infrastructure.md
  - docs/architecture/security-and-privacy.md
---

# Next_Path - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **Next_Path (AI-Based Career Decision & Pathway Companion)**, decomposing requirements from the PRD, Design System v6, and Sharded System Architecture into prioritized, implementable developer user stories.

---

## Requirements Inventory

### Functional Requirements (PRD Section 12)

#### P0 — Core MVP Requirements
- **FR-01: Stage-aware onboarding** — Class 8–10, Class 11–12, and early-college users receive dynamically branched questions, stage-appropriate prompts, and milestone outputs.
- **FR-02: Student context profile** — Captures interests, goals, practical constraints, geographic relocation preferences, language preferences, and academic context without mandating academic marks.
- **FR-03: Guardian context** — Guardian priorities, financial ceilings, and relocation constraints are captured separately and compared against the student's view without overriding student agency.
- **FR-04: Career library** — Occupational catalogue containing work realities, required skills, localized Indian entry routes (exams, degrees, durations), costs in INR, risks, and dated evidence.
- **FR-05: Multi-option recommendation** — Produces 3 to 5 ranked career pathway options side-by-side; never forces a single answer or predicts destiny.
- **FR-06: Explainability** — Every recommendation provides explicit, inspectable reasons for fit, itemized constraints/concerns, and missing-evidence flags.
- **FR-07: Fit / feasibility / evidence labels** — Separates personal fit (`Strong`/`Moderate`/`Emerging`) from practical feasibility (`High`/`Moderate`/`Challenging`/`Low`) and evidence quality (`High`/`Moderate`/`Preliminary`/`Sparse`).
- **FR-08: Career comparison** — Interactive side-by-side comparison matrix for 2 to 3 pathways (duration, cost ranges, exam prerequisites, demand caveats).
- **FR-09: Primary and backup selection** — Student selects a primary trajectory and at least one realistic backup, or explicitly chooses "continue exploring."
- **FR-10: Adaptive roadmap** — Generates actionable 30/90/180-day milestone plans with clear prerequisites, free resources, costs, and fallback branches.
- **FR-11: Skill-gap review** — Compares a student's current self-reported or demonstrated skills against a target career's required skills, splits them into essential, useful, and optional categories, and surfaces the actionable skill gap.
- **FR-12: Low-cost resources** — Every paid recommendation or skill requirement includes a verified free or public alternative (e.g. NPTEL, Swayam, Khan Academy).
- **FR-13: Scholarship signposting** — Searchable, filterable scholarship catalogue with mandatory governance metadata (eligibility rules, active deadlines, official portal links, verification dates).
- **FR-14: Market snapshot** — Localized labor market indicators with sample timeframe, entry/mid salary bands in INR, top skills, competition caveats, and uncertainty disclosures.
- **FR-15: Counselor escalation** — Triage and routing mechanism for high-stakes decisions, severe parent-student deadlock, low-evidence profiles, or emergency safety flags.
- **FR-16: AI guidance boundaries** — Grounded career Q&A chatbot restricted to approved database records; discloses data gaps, rejects guarantees, and logs all interactions.
- **FR-17: Parent summary** — Generates a persisted, plain-language summary of recommendations, cost estimates, trade-offs, and next steps for family discussion.
- **FR-18: Reassessment** — Enables profile updating, reassessment execution, and roadmap revisions while preserving previous cycles via `is_current = FALSE`.
- **FR-19: Low-bandwidth journey** — PWA shell with offline caching (TanStack Query) enabling completion over basic smartphones and 2G/3G connectivity.
- **FR-20: Privacy and minor safety** — Minimum data collection, mandatory guardian consent for Class 8–12 minors (`consent_given_by`), RBAC, and right-to-erasure with safety audit retention.

#### P1 — Post-MVP Backlog Requirements (Cited in Locked Tech Stack)
- **FR-27 [P1 / Backlog]: Scholarship deadline reminders** — In-process scheduler (APScheduler) sends automated notification reminders to students before application deadlines for matched scholarships.
- **FR-28 [P1 / Backlog]: Progress dashboard** — Visual progress tracking dashboard (Recharts) visualizing milestone completion velocity, skill acquisition evidence, and scheduled reassessment triggers.

---

### Non-Functional Requirements (PRD & System Architecture)

- **NFR-01: Performance & Latency [Architect-Proposed Engineering Target — Pending Product Owner Sign-off]** — Recommendation scoring executed in < 500ms; single-turn LLM generation completed in < 3.0s; initial PWA load < 2.0s over 3G connectivity.
- **NFR-02: Security & Transport Encryption (PRD Section 16)** — Mandatory TLS 1.3 in transit; AES-256 transparent disk encryption at rest via managed PostgreSQL; stateless JWT authentication (`python-jose`).
- **NFR-03: Child Data Protection (DPDP Act Baseline & PRD Section 16)** — Mandatory guardian consent verification for users under 18 prior to evaluation; zero commercial data selling or advertisement tracking.
- **NFR-04: Auditability & Safety Retention (PRD Section 14)** — Safety-flagged escalation tickets (`crisis_safety_flag`) and escalated chat interactions (`was_escalated = TRUE`) are anonymized with `student_id = NULL` on erasure rather than purged.
- **NFR-05: Determinism & Explainability (PRD Section 15 & Tech Stack Section 4)** — Recommendation engine uses transparent, auditable weighted-sum mathematical formulas in plain Python with zero black-box ML/RAG dependencies.
- **NFR-06: Accessibility & Design Token Compliance (Design System v6)** — WCAG AA contrast compliance (4.5:1), responsive mobile-first UI built strictly with Design System v6 tokens.

---

### Additional Requirements (System Architecture)

- **ARCH-01: Starter & Codebase Layout** — FastAPI backend (`/backend`), React 18 / TypeScript / Vite frontend (`/frontend`), and Seed Data (`/data/seed`).
- **ARCH-02: Database & Schema Migrations** — PostgreSQL 16 schema with 14 relational tables, JSONB GIN indexes, UUID PKs, and Alembic migration management.
- **ARCH-03: Deterministic Seed Ingestion CLI** — Idempotent script (`python -m backend.data.seed_db`) loading Scholar-Spot CSV, Naukri CSVs with `naukri_title_to_career_map.json`, and O*NET v30.3 with $(\\text{raw} - 1)/4 \\times 100$ normalization and overrides.
- **ARCH-04: Historical Batching & Superseding** — `recommendation_batches` entity grouping recommendation sets; atomic soft-superseding (`is_current = FALSE, superseded_at = NOW()`).
- **ARCH-05: Grounded LLM Client** — Anthropic API client wrapping single-turn Claude Messages API calls for Career Q&A and Parent Summary generation with strict system prompt bounds.

---

### UX Design Requirements (Design System v6 & Component Architecture)

- **UX-DR01: Design Token System** — Tailwind CSS configuration mapping Notion-inspired palette: Primary Blue `#0075de`, Paper Canvas `#ffffff`/`#f6f5f4`, Ink `#000000`, AI Accent `#391c57`/`#d6b6f6`, Inter typography across 11 scale tiers.
- **UX-DR02: MatchScoreBadge Component** — Decomposed 3-part badge rendering Fit Evidence, Feasibility, and Evidence Quality without bare misleading percentages.
- **UX-DR03: CareerCard Component** — Clean white surface card displaying occupational cluster, localized Indian entry routes, cost range in INR, risks, and primary/backup toggle buttons.
- **UX-DR04: CareerComparisonView Component** — Side-by-side comparison matrix comparing 2–3 career pathways.
- **UX-DR05: RoadmapTimeline Component** — Interactive vertical milestone timeline structured into 7-day, 30-day, 90-day, and 180-day buckets with fallback action selectors.
- **UX-DR06: ChatbotFAB & Drawer Component** — Floating Action Button with AI decorative accent (`#391c57`), opening a grounded slide-over Q&A drawer with source citation badges.
- **UX-DR07: GuardianSummaryView Component** — Paper-calm guardian dashboard with cost breakdown card, plain-language narrative, and parent-student discussion guide.
- **UX-DR08: Mobile-First Responsive PWA Shell** — Touch-friendly layout, offline caching shell, and accessible input fields.
- **UX-DR09: OnboardingWizard Component** — Stage-aware multi-step form (Class 8–10 / 11–12 / Early College conditional branching) with minor consent gate dialog, budget selector, and progress meter (`React Hook Form` + `Zod`).
- **UX-DR10: CounselorQueueView Component** — Counselor triage table, frozen student summary snapshot inspector, override decision editor, and mandatory override rationale capture modal (FR-15, PRD Section 14).

---

### FR Coverage Map

| Requirement ID | Requirement Name | Assigned Epic |
|---|---|---|
| **FR-01** | Stage-Aware Onboarding | **Epic 1**: Foundation, Data Grounding & Minor-Safe Onboarding |
| **FR-02** | Student Context Profile | **Epic 1**: Foundation, Data Grounding & Minor-Safe Onboarding |
| **FR-03** | Guardian Context | **Epic 1**: Foundation, Data Grounding & Minor-Safe Onboarding |
| **FR-04** | Career Library & Localized Routes | **Epic 2**: Multi-Option Recommendation & Career Comparison |
| **FR-05** | Multi-Option (3–5) Recommendation | **Epic 2**: Multi-Option Recommendation & Career Comparison |
| **FR-06** | Explainability & Reasons/Concerns | **Epic 2**: Multi-Option Recommendation & Career Comparison |
| **FR-07** | Fit / Feasibility / Evidence Labels | **Epic 2**: Multi-Option Recommendation & Career Comparison |
| **FR-08** | Side-by-Side Career Comparison | **Epic 2**: Multi-Option Recommendation & Career Comparison |
| **FR-09** | Primary & Backup Selection | **Epic 3**: Pathway Selection, Adaptive Roadmap & Free-First Actions |
| **FR-10** | Adaptive 30/90/180-Day Roadmap | **Epic 3**: Pathway Selection, Adaptive Roadmap & Free-First Actions |
| **FR-11** | Skill-Gap Review & Categorization | **Epic 3**: Pathway Selection, Adaptive Roadmap & Free-First Actions |
| **FR-12** | Free & Low-Cost Learning Resources | **Epic 3**: Pathway Selection, Adaptive Roadmap & Free-First Actions |
| **FR-13** | Scholarship Signposting & Filters | **Epic 3**: Pathway Selection, Adaptive Roadmap & Free-First Actions |
| **FR-14** | Market Snapshot & Labor Trends | **Epic 2**: Multi-Option Recommendation & Career Comparison |
| **FR-15** | Counselor Escalation & Triage | **Epic 5**: Counselor Escalation, Reassessment & Governance |
| **FR-16** | Grounded AI Chatbot & Audit | **Epic 4**: Grounded AI Chatbot & Persisted Parent Summary |
| **FR-17** | Persisted Parent Summary | **Epic 4**: Grounded AI Chatbot & Persisted Parent Summary |
| **FR-18** | Reassessment & History Preservation | **Epic 5**: Counselor Escalation, Reassessment & Governance |
| **FR-19** | Low-Bandwidth / PWA Journey | **Epic 1**: Foundation, Data Grounding & Minor-Safe Onboarding |
| **FR-20** | Privacy, Minor Safety & Consent | **Epic 1** (Consent Gate) & **Epic 5** (Erasure & Governance) |
| **FR-27** | Scholarship Deadline Reminders (P1) | **Epic 6**: Progress Dashboard & Scholarship Reminders [P1 Backlog] |
| **FR-28** | Progress Analytics Dashboard (P1) | **Epic 6**: Progress Dashboard & Scholarship Reminders [P1 Backlog] |

---

## Epic List

### Epic 1: Foundation, Data Grounding & Minor-Safe Onboarding
**Goal:** Establish the full-stack repository, database schema, and seed ingestion CLI; deliver JWT authentication with mandatory guardian consent recording for Class 8–12 minors; and provide a stage-aware, mobile-first onboarding experience capturing student and guardian context.
**FRs covered:** FR-01, FR-02, FR-03, FR-19, FR-20  
**Hard Dependency:** None (First Epic).

### Epic 2: Multi-Option Recommendation & Career Comparison
**Goal:** Implement the deterministic pure-Python weighted-sum scoring engine to evaluate student profiles against the localized career library, presenting 3 to 5 ranked career pathways with inspectable fit/feasibility/evidence quality labels, detailed reasons/concerns, and an interactive side-by-side comparison matrix.
**FRs covered:** FR-04, FR-05, FR-06, FR-07, FR-08, FR-14  
**Hard Dependency:** Epic 1 Story 1.3 (Populated Seed Catalog in PostgreSQL) & Story 1.5 (Student Profile).

### Epic 3: Pathway Selection, Adaptive Roadmap & Free-First Actions
**Goal:** Enable students to commit to a primary trajectory and realistic backup (or choose to continue exploring), automatically generating an adaptive 30/90/180-day milestone roadmap with low-cost/free resource signposting, fallback branching, categorized skill gaps, milestone verification, and filterable verified scholarships.
**FRs covered:** FR-09, FR-10, FR-11, FR-12, FR-13  
**Hard Dependency:** Epic 2 (Active Recommendation Batch & Career Catalog).

### Epic 4: Grounded AI Chatbot & Persisted Parent Summary
**Goal:** Provide single-turn AI assistance strictly bounded to verified database records with source citations and safety crisis interception, and generate persisted plain-language summaries and discussion guides for parents without text drift.
**FRs covered:** FR-16, FR-17  
**Hard Dependency:** Epic 2 (Recommendations and Career Library) & Anthropic API client.

### Epic 5: Counselor Escalation, Reassessment & Governance
**Goal:** Provide human-in-the-loop counselor triage for complex, deadlock, or crisis scenarios with frozen profile snapshots; enable continuous profile reassessment preserving historical recommendation batches; and enforce DPDP-aligned data rights with safety-audit retention exceptions.
**FRs covered:** FR-15, FR-18, FR-20  
**Hard Dependency:** Epics 1–4 (Complete user journey active).

### Epic 6: Progress Dashboard & Scholarship Reminders [P1 Backlog]
**Goal:** Provide automated deadline reminder scheduling for matched scholarships and a visual analytics dashboard tracking long-term milestone completion velocity and reassessment triggers.
**FRs covered:** FR-27, FR-28  
**Hard Dependency:** Epics 1–3.

---

## Epic 1: Foundation, Data Grounding & Minor-Safe Onboarding

**Goal:** Establish the full-stack repository, database schema, and seed ingestion CLI; deliver JWT authentication with mandatory guardian consent recording for Class 8–12 minors; and provide a stage-aware, mobile-first onboarding experience capturing student and guardian context.

### Story 1.1: Full-Stack Project Scaffolding & Design System Tokens
As a developer,  
I want a unified repository layout with FastAPI backend, React/Vite/TypeScript frontend, and Tailwind CSS tokens,  
So that the team can build full-stack features with consistent Design System v6 styling and Docker dev environments.

**Acceptance Criteria:**
- **Given** an empty repository workspace,
- **When** the developer executes `docker-compose up`,
- **Then** the FastAPI backend runs on port 8000, React Vite frontend runs on port 5173, and PostgreSQL 16 runs on port 5432.
- **And** Tailwind CSS is configured with Design System v6 tokens: Primary Blue `#0075de`, Canvas Soft `#f6f5f4`, Surface `#ffffff`, Ink `#000000`, and AI Accent `#391c57`.
- **And** `vite-plugin-pwa` is configured with manifest and service worker shell supporting offline caching (FR-19, UX-DR01, UX-DR08, ARCH-01).

---

### Story 1.2: PostgreSQL Database Schema & Migration Setup
As a developer,  
I want SQLAlchemy 2.0 models and Alembic migrations for the 14 domain tables,  
So that database structures, foreign keys, and indexes are version-controlled and initialized reliably.

**Acceptance Criteria:**
- **Given** a clean PostgreSQL 16 database,
- **When** `alembic upgrade head` is executed,
- **Then** all 14 tables are created (`users`, `student_profiles`, `guardian_contexts`, `career_library`, `career_skills`, `scholarships`, `market_snapshots`, `recommendation_batches`, `recommendations`, `roadmaps`, `roadmap_milestones`, `parent_summaries`, `chat_interactions`, `counselor_escalations`).
- **And** GIN indexes are created on `interests`, `applicable_stages`, and `top_demanded_skills`.
- **And** `chat_interactions.student_id` and `counselor_escalations.student_id` are created with `ON DELETE SET NULL` constraints (ARCH-02, NFR-02).

---

### Story 1.3: Deterministic Seed Data Ingestion CLI
As a system administrator,  
I want an idempotent CLI command to load the Scholar-Spot, Naukri, and O*NET seed datasets into Postgres,  
So that the career library, market snapshots, and scholarships catalog are fully populated and localized for Indian students.

**Acceptance Criteria:**
- **Given** raw seed CSVs in `/data/seed/` and mapping files in `/data/seed/mappings/`,
- **When** `python -m backend.data.seed_runner` is executed,
- **Then** Scholar-Spot CSV (`dataset.csv`) is cleaned and inserted into `scholarships` with `last_verified_date = '2026-08-20'` and `official_source_url` populated.
- **And** Naukri postings are mapped to `career_library.id` using `/data/seed/mappings/naukri_title_to_career_map.json` (unmapped titles logged to `unmapped_titles.log`), generating aggregated `market_snapshots` with salary bands in INR and competition caveats.
- **And** O*NET Importance ratings are normalized via $(\\text{raw} - 1.0)/4.0 \\times 100$, categorized into Essential ($\\ge 70$), Useful ($50–69$), and Optional ($< 50$) tiers with `/data/seed/mappings/onet_skill_tier_overrides.json` applied, populating `career_library` and `career_skills`.
- **And** the CLI is idempotent (re-running does not produce duplicate primary keys or crash) (ARCH-03, FR-04, FR-13, FR-14).

---

### Story 1.4: User Authentication & Minor Consent Recording API
As a student or guardian,  
I want to register an account and record verified guardian consent for minors,  
So that my identity is authenticated securely and child data privacy is captured under DPDP principles.

**Acceptance Criteria:**
- **Given** valid registration details (`email`, `password`, `full_name`, `role`),
- **When** `POST /api/v1/auth/register` is called,
- **Then** a new user is created with bcrypt-hashed password and a stateless JWT is returned.
- **When** `POST /api/v1/auth/minor-consent` is submitted with valid guardian details and confirmed signature for a student profile,
- **Then** `student_profiles` captures `consent_type = 'guardian_consent_minor'`, `consent_given_by = <guardian_id>`, and `consent_recorded_at = NOW()` (FR-20, NFR-02, NFR-03).

---

### Story 1.5: Stage-Aware Onboarding Wizard UI & Profile API
As a student or guardian,  
I want to complete a multi-step self-discovery questionnaire on my phone,  
So that the system understands my educational stage, interests, practical constraints, and guardian priorities.

**Acceptance Criteria:**
- **Given** a logged-in student,
- **When** navigating `/onboarding`,
- **Then** the `OnboardingWizard` renders stage-specific paths: Class 8–10 (Stream exploration), Class 11–12 (Degree/entrance path), or Early College (Pathway correction).
- **And** questions capture interests, RIASEC tags, self-reported strengths, budget tier (`low_cost_only`, `moderate_up_to_2_lakhs`, `flexible_above_2_lakhs`), and relocation willingness (`home_district_only`, `within_state`, `anywhere_in_india`) without requiring academic marks.
- **And** guardian context is captured via `/api/v1/profile/guardian` and stored in `guardian_contexts`.
- **And** the form state is saved progressively in local cache (TanStack Query) so progress is preserved across network drops (FR-01, FR-02, FR-03, FR-19, UX-DR09).

---

## Epic 2: Multi-Option Recommendation & Career Comparison

**Goal:** Implement the deterministic pure-Python weighted-sum scoring engine to evaluate student profiles against the localized career library, presenting 3 to 5 ranked career pathways with inspectable fit/feasibility/evidence quality labels, detailed reasons/concerns, and an interactive side-by-side comparison matrix.

### Story 2.1: Deterministic Weighted-Sum Scoring Engine
As a student,  
I want my profile evaluated using a transparent mathematical scoring algorithm,  
So that I receive 3–5 tailored career options without opaque black-box machine learning or forced single verdicts.

*(Note: Minor consent validation and access gating are handled upstream by the API controller in Story 2.3).*

**Acceptance Criteria:**
- **Given** a student profile with completeness $\\ge 50\\%$,
- **When** the scoring engine calculates recommendations,
- **Then** Fit Score is computed via $0.60 \\cdot \\text{RIASEC\\_Alignment} + 0.40 \\cdot \\text{Aptitude\\_Signal\\_Match}$ ($0–100$).
- **And** Feasibility Score is computed via $0.45 \\cdot \\text{Budget\\_Compatibility} + 0.35 \\cdot \\text{Relocation\\_Fit} + 0.20 \\cdot \\text{Stage\\_Eligibility}$ ($0–100$).
- **And** Evidence Quality Score is computed via $0.70 \\cdot \\text{profile\\_completeness} + 0.30 \\cdot \\text{records\\_weight}$ ($0–100$).
- **And** Composite Score is calculated via $\\max(0, 0.55 \\cdot \\text{Fit} + 0.45 \\cdot \\text{Feasibility} - 0.10 \\cdot (100 - \\text{Evidence}))$.
- **And** scoring executes in < 500ms [Architect-proposed engineering target, pending product owner confirmation] in pure Python without external ML/vector API calls (FR-05, NFR-01, NFR-05).

---

### Story 2.2: Structured Explainability & 3-Label Assignment
As a student,  
I want to see separate labels for Fit, Feasibility, and Evidence Quality along with explicit reasons and concerns,  
So that I understand exactly why a career fits me and what hurdles or data gaps exist.

**Acceptance Criteria:**
- **Given** calculated component scores for each career option,
- **When** labels are derived,
- **Then** Fit is classified into `Strong` ($\\ge 75$), `Moderate` ($55–74.9$), `Emerging` ($35–54.9$), or `Insufficient evidence` ($< 35$).
- **And** Feasibility is classified into `High` ($\\ge 75$), `Moderate` ($50–74.9$), `Challenging` ($30–49.9$), or `Low` ($< 30$).
- **And** Evidence Quality is classified into `High` ($\\ge 80$), `Moderate` ($50–79.9$), `Preliminary` ($30–49.9$), or `Sparse` ($< 30$).
- **And** the engine outputs itemized arrays for `reasons` (why it fits), `concerns` (cost/exam filters), and `missing_evidence_flags` (FR-06, FR-07).

---

### Story 2.3: Recommendation Batching & Minor Consent Enforcement API
As a developer,  
I want recommendation evaluations guarded by minor consent verification, grouped under `recommendation_batches`, and exposed via REST APIs,  
So that unconsented evaluations are strictly blocked and valid recommendations are persisted immutably per evaluation cycle.

**Acceptance Criteria:**
- **Given** a student profile enrolled in `class_8_10` or `class_11_12` without a verified guardian consent record (`consent_type = 'guardian_consent_minor'`),
- **When** `POST /api/v1/recommendations/evaluate` is called,
- **Then** the API rejects the request with `403 Forbidden` and error message "Guardian consent is required for minors before generating recommendations" (FR-20, NFR-03).
- **Given** an authenticated student with valid consent,
- **When** `POST /api/v1/recommendations/evaluate` is called,
- **Then** a new `RecommendationBatch` is inserted with `batch_number = 1`, `is_current = TRUE`.
- **And** the top 3–5 ranked career options are inserted into `recommendations` linked to `batch_id`.
- **When** `GET /api/v1/recommendations/current` is called,
- **Then** the active batch and its recommendations are returned [Architect-proposed target < 200ms, pending product owner confirmation] (ARCH-04, FR-05, FR-20, NFR-01, NFR-03).

---

### Story 2.4: Results Dashboard & MatchScoreBadge UI
As a student,  
I want to view my 3–5 recommended career options on a clear dashboard with decomposed badges,  
So that I can explore suitable options without being misled by a single arbitrary percentage.

**Acceptance Criteria:**
- **Given** active recommendations returned by the API,
- **When** the student navigates to `/results`,
- **Then** the `ResultsDashboard` displays 3 to 5 `CareerCard` components.
- **And** each card features the `MatchScoreBadge` component displaying the 3-part badge: Fit Evidence (e.g. `Strong` in `#1aae39`), Feasibility (e.g. `High`), and Evidence Quality (e.g. `Moderate`).
- **And** each card lists localized Indian entry routes, duration, estimated cost range in INR, and key risks/trade-offs (FR-05, FR-07, UX-DR02, UX-DR03).

---

### Story 2.5: Side-by-Side Career Comparison View
As a student,  
I want to compare 2 to 3 career pathways side-by-side in a comparative matrix,  
So that I can evaluate trade-offs between entrance exams, costs, duration, and market competition before deciding.

**Acceptance Criteria:**
- **Given** selected careers on the dashboard,
- **When** the student clicks "Compare Selected",
- **Then** `POST /api/v1/careers/compare` is called and `CareerComparisonView` renders a side-by-side table.
- **And** columns compare required entrance exams (e.g. JEE vs NEET vs CUET), estimated total degree cost in INR, preparation duration, and labor market competition caveats from `market_snapshots` (FR-08, FR-14, UX-DR04).

---

## Epic 3: Pathway Selection, Adaptive Roadmap & Free-First Actions

**Goal:** Enable students to commit to a primary trajectory and realistic backup (or choose to continue exploring), automatically generating an adaptive 30/90/180-day milestone roadmap with low-cost/free resource signposting, fallback branching, categorized skill gaps, milestone verification, and filterable verified scholarships.

### Story 3.1: Pathway Selection & Roadmap Initialization API
As a student,  
I want to select my primary career pathway and a realistic backup option,  
So that my choice is recorded and an execution roadmap is created.

**Acceptance Criteria:**
- **Given** an active recommendation batch,
- **When** `POST /api/v1/recommendations/select-pathways` is called with `primary_career_id` and optional `backup_career_id`,
- **Then** the selected recommendations update `is_primary_selection = TRUE` and `is_backup_selection = TRUE`.
- **And** a new `Roadmap` entity is initialized in `roadmaps` with `status = 'active'` and `is_current = TRUE` (FR-09, FR-10).

---

### Story 3.2: Adaptive 30/90/180-Day Milestone Generator
As a student,  
I want a step-by-step roadmap broken into 7-day, 30-day, 90-day, and 180-day milestones with fallback options,  
So that I know exactly what to do next and have a plan B if my circumstances change.

**Acceptance Criteria:**
- **Given** a newly initialized roadmap,
- **When** the roadmap service generates milestones,
- **Then** milestones are created across 4 timeframe buckets: `next_7_days` (exploration/conversation), `day_30` (foundational skill/small output), `day_90` (exam prep/project artifact), and `day_180` (applications/reassessment).
- **And** every milestone specifies `estimated_cost_inr`, prerequisites, and an explicit `fallback_action` string (FR-10).

---

### Story 3.3: Skill-Gap Categorization & Free-First Resource Signposting
As a student,  
I want to see my required career skills split into essential, useful, and optional categories with verified free courses,  
So that I can build readiness affordably without expensive commercial courses.

**Acceptance Criteria:**
- **Given** a target primary career,
- **When** skills are fetched via `/api/v1/careers/{id}`,
- **Then** skills are categorized into `essential`, `useful`, and `optional` tiers based on normalized importance.
- **And** every essential skill includes `free_learning_resource_name` and `free_learning_resource_url` (e.g. NPTEL, Swayam, Khan Academy) with a commercial conflict-of-interest disclosure (FR-11, FR-12).

---

### Story 3.4: Interactive Roadmap Timeline UI & Proof Submission
As a student,  
I want an interactive vertical timeline to track my progress and submit proof of milestone completion,  
So that I stay accountable and have evidence of my learning.

**Acceptance Criteria:**
- **Given** an active roadmap,
- **When** viewing `/roadmap`,
- **Then** `RoadmapTimeline` displays vertical milestone cards grouped by timeframe bucket.
- **When** the student marks a milestone complete and submits proof via `PATCH /api/v1/roadmap/milestones/{id}/complete` (`completion_evidence_type` and URL/note),
- **Then** the milestone updates `is_completed = TRUE` and unlocks dependent milestones (FR-10, UX-DR05).

---

### Story 3.5: Verified Scholarships Search & Filter API & UI Drawer
As a student from a low- or moderate-income family,  
I want to search and filter government and private scholarships matching my state, category, and qualification,  
So that I can find verified financial support before application deadlines.

**Acceptance Criteria:**
- **Given** the populated scholarships catalog,
- **When** `GET /api/v1/scholarships` is called with filters (`state`, `target_category`, `min_qualification`, `income_ceiling_inr`),
- **Then** matching scholarships are returned [Architect-proposed target < 200ms, pending product owner confirmation] with mandatory governance metadata (`eligibility_summary`, `deadline_description`, `required_documents`, `official_source_url`, `last_verified_date`).
- **And** clicking a scholarship in the roadmap UI opens a drawer displaying official portal links and document checklists (FR-13, NFR-01).

---

## Epic 4: Grounded AI Chatbot & Persisted Parent Summary

**Goal:** Provide single-turn AI assistance strictly bounded to verified database records with source citations and safety crisis interception, and generate persisted plain-language summaries and discussion guides for parents without text drift.

### Story 4.1: Anthropic Claude API Client Wrapper
As a developer,  
I want an async client wrapper for Anthropic Claude Messages API,  
So that the backend can execute single-turn LLM calls with configured token budgets and error resilience.

**Acceptance Criteria:**
- **Given** valid `ANTHROPIC_API_KEY` in environment,
- **When** the service invokes `llm_client.generate_message(system_prompt, user_content)`,
- **Then** the call executes as a single-turn stateless HTTPS request to Anthropic Messages API.
- **And** single-turn generation completes [Architect-proposed target < 3.0s, pending product owner confirmation] with network timeouts or API rate limits triggering graceful error fallbacks without hanging the backend (ARCH-05, NFR-01).

---

### Story 4.2: Grounded Career Q&A Chatbot Engine & Audit Logging
As a student,  
I want to ask questions about careers and receive factual answers with source citations,  
So that I get instant clarification grounded in verified database facts.

**Acceptance Criteria:**
- **Given** a student query submitted to `POST /api/v1/chat/message`,
- **When** the chatbot service processes the request,
- **Then** relevant `career_library` records are retrieved via SQL and injected into `<approved_career_context>`.
- **And** the LLM system prompt enforces strict negative grounding ("Answer only from approved context; state unavailable if unmentioned").
- **And** the interaction is saved in `chat_interactions` with `question_text`, `career_ids_injected`, `answer_text`, and `was_escalated = FALSE` (FR-16, NFR-04).

---

### Story 4.3: AI Safety & Emergency Crisis Interceptor
As a system safety officer,  
I want all student queries scanned for distress or self-harm keywords before career advice is generated,  
So that vulnerable students receive immediate supportive crisis routing.

**Acceptance Criteria:**
- **Given** a student query containing crisis or self-harm indicators,
- **When** `POST /api/v1/chat/message` receives the query,
- **Then** standard career guidance is immediately halted.
- **And** the response returns national emergency crisis numbers (Tele-MANAS, KIRAN 1800-599-0019).
- **And** a high-priority ticket with `trigger_reason = 'crisis_safety_flag'` is automatically created in `counselor_escalations`, and `chat_interactions` logs `was_escalated = TRUE` (FR-16, PRD Section 14, NFR-04).

---

### Story 4.4: Persisted Parent Summary Generator & Guardian View
As a parent or guardian,  
I want a plain-language summary of my child's career options, costs, and risks,  
So that our family can have an informed, productive discussion without conflicting information.

**Acceptance Criteria:**
- **Given** a newly finalized recommendation batch,
- **When** `parent_summary_service` is triggered,
- **Then** an LLM call synthesizes top careers, Indian entry routes, estimated costs in INR, and guardian constraints into a 1–2 paragraph plain-language overview.
- **And** the text is saved in `parent_summaries` bound to `recommendation_batch_id`.
- **When** viewing `/guardian`, `GuardianSummaryView` renders the persisted summary, cost breakdown card, and shared discussion points without re-generation drift (FR-17, UX-DR07).

---

### Story 4.5: Chatbot FAB & Slide-Over Drawer UI
As a student,  
I want a floating chat button and slide-over panel available across all pages,  
So that I can ask quick questions whenever I encounter unfamiliar terms or exams.

**Acceptance Criteria:**
- **Given** any authenticated student view,
- **When** the student clicks `ChatbotFAB` (styled with AI Accent `#391c57`),
- **Then** `ChatbotDrawer` slides open from the right.
- **And** messages display approved source citation badges and an explicit uncertainty disclaimer (FR-16, UX-DR06).

---

## Epic 5: Counselor Escalation, Reassessment & Governance

**Goal:** Provide human-in-the-loop counselor triage for complex, deadlock, or crisis scenarios with frozen profile snapshots; enable continuous profile reassessment preserving historical recommendation batches; and enforce DPDP-aligned data rights with safety-audit retention exceptions.

### Story 5.1: Counselor Escalation Rule Evaluator & Triage API
As a counselor,  
I want an API to triage escalated student tickets with frozen profile snapshots,  
So that I can review high-stakes decisions, parent-student deadlocks, or crisis flags.

**Acceptance Criteria:**
- **Given** an escalation trigger (student request, parent-student constraint deadlock, low evidence score, or crisis flag),
- **When** `POST /api/v1/escalations/trigger` is executed,
- **Then** a ticket is created in `counselor_escalations` containing a frozen `student_summary_snapshot` JSON.
- **When** an authenticated counselor calls `GET /api/v1/counselor/queue`,
- **Then** pending tickets are returned ordered by urgency (crisis flags prioritized) (FR-15).

---

### Story 5.2: Counselor Review Portal & Override Audit UI
As a counselor,  
I want a dedicated triage portal to review student context, record notes, and submit overrides with mandatory rationale,  
So that human judgment can guide complex cases with full auditability.

**Acceptance Criteria:**
- **Given** an assigned escalation ticket in `CounselorQueueView`,
- **When** the counselor reviews the student's frozen snapshot and records an override via `POST /api/v1/counselor/review/{id}`,
- **Then** `counselor_notes`, `counselor_override_decision`, and mandatory `counselor_override_rationale` are saved.
- **And** if `student_id` is `NULL` (anonymized account), the view renders `[Anonymized Profile / Closed Account]` gracefully without crashing (FR-15, UX-DR10).

---

### Story 5.3: Continuous Reassessment & Historical Batch Lifecycle
As a student whose interests, marks, or constraints have changed,  
I want to retake exploration and update my pathway without losing my previous roadmap history,  
So that my career companion evolves with me over time.

**Acceptance Criteria:**
- **Given** an active student profile with previous recommendations (`batch_number = 1`),
- **When** `POST /api/v1/reassess/trigger` is called with updated preferences,
- **Then** an atomic transaction updates previous active batches, recommendations, and roadmaps to `is_current = FALSE, superseded_at = NOW()`.
- **And** a new `RecommendationBatch` is created with `batch_number = 2, is_current = TRUE`.
- **And** previous roadmap milestones remain in the database linked to the superseded roadmap ID, preserving full longitudinal history (FR-18, ARCH-04).

---

### Story 5.4: Right-to-Erasure & Safety Audit Anonymization Service
As a data protection officer,  
I want user account deletion requests to purge personal profile data while preserving anonymized safety crisis records,  
So that the platform complies with DPDP privacy rights while satisfying legal duty-of-care audit requirements.

**Acceptance Criteria:**
- **Given** an account deletion request for a student user,
- **When** the account erasure service executes,
- **Then** personal profile data (`student_profiles`), guardian inputs (`guardian_contexts`), roadmaps, and non-escalated chat logs are permanently deleted.
- **And** `counselor_escalations` rows with `trigger_reason = 'crisis_safety_flag'` and `chat_interactions` with `was_escalated = TRUE` have `student_id` set to `NULL`, identifying PII scrubbed from `student_summary_snapshot`, and are retained for legal audit (FR-20, NFR-04).

---

## Epic 6: Progress Dashboard & Scholarship Reminders [P1 Backlog]

**Goal:** Provide automated deadline reminder scheduling for matched scholarships and a visual analytics dashboard tracking long-term milestone completion velocity and reassessment triggers.

### Story 6.1: In-Process Scholarship Deadline Reminder Scheduler (P1)
As a student,  
I want automated notification reminders as application deadlines approach for my matched scholarships,  
So that I do not miss critical financial aid application windows.

**Acceptance Criteria:**
- **Given** an active student profile with matched scholarships,
- **When** APScheduler runs daily deadline verification jobs,
- **Then** notifications are generated for scholarships with deadlines within 14 days and 3 days (FR-27).

---

### Story 6.2: Visual Progress Analytics Dashboard (P1)
As a student or counselor,  
I want to view visual charts of completed milestones and skill readiness trends,  
So that I can evaluate pathway momentum and identify when reassessment is needed.

**Acceptance Criteria:**
- **Given** milestone completion history over time,
- **When** navigating `/dashboard`,
- **Then** Recharts components render milestone completion velocity across 30/90/180-day buckets, skill acquisition progress, and next scheduled reassessment dates (FR-28).
