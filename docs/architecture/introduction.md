# System Architecture: Introduction & Project Context

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/introduction.md`  
**Status:** Approved Architectural Baseline  
**Source of truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Companion shards:** 
- `docs/architecture/tech-stack.md`
- `docs/architecture/data-models.md`
- `docs/architecture/api-specification.md`
- `docs/architecture/database-schema.md`
- `docs/architecture/components.md`
- `docs/architecture/core-workflows.md`
- `docs/architecture/source-tree.md`
- `docs/architecture/coding-standards.md`
- `docs/architecture/deployment-and-infrastructure.md`
- `docs/architecture/security-and-privacy.md`

---

## 1. Executive Summary & Problem Context

The **AI-Based Career Decision & Pathway Companion** is designed for Indian school and early-college students navigating critical education transitions (stream selection in Class 8–10, degree and entrance path in Class 11–12, and pathway correction in early college).

### Product Thesis (Traceable to PRD Section 1 & 2)
Students do not suffer from an information shortage — career information is fragmented across tests, portals, colleges, job boards, social media, and word of mouth. The core problem is converting fragmented signals into a **trusted, affordable, feasible next step** with verifiable evidence and human escalation.

The system is fundamentally structured as a **Decision-Support Companion**, explicitly rejecting:
1. **Black-box prophecy / destiny predictions:** The platform never claims to pick "one perfect career" or "predict a student's destiny" (PRD Section 1, 15).
2. **Unvalidated psychometric accuracy claims:** Recommendations provide inspectable evidence, separate fit from feasibility, and highlight missing evidence (FR-06, FR-07).
3. **Hidden commercial bias:** Free and public entry routes are prioritized, and commercial links are disclosed (FR-12, Section 13.3).

---

## 2. Core User Outcomes (Traceable to PRD Section 1.2)

Every completed journey through the architecture guarantees:
1. **Multi-Option Shortlist (3–5 Pathways):** Suitable clusters/pathways presented side-by-side with clear rationale, constraints, and trade-offs (FR-05, FR-08).
2. **Three-Tier Transparent Scoring:** Explicit separation of **Personal Fit**, **Practical Feasibility**, and **Evidence Quality** (FR-07).
3. **Primary & Backup Selection:** A primary trajectory paired with a realistic, low-regret fallback branch (FR-09).
4. **Actionable 30/90/180-Day Adaptive Roadmap:** Step-by-step milestones, free/low-cost resources, entrance exams, and verified scholarship deadlines (FR-10, FR-11, FR-12, FR-13).
5. **Guardian Alignment & Counselor Escalation:** Structured parent summaries and human counselor routing for high-stakes or low-evidence scenarios (FR-15, FR-17).

---

## 3. High-Level Architecture Invariants

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

## 4. Architectural Shard Index

| Shard | File Path | Focus |
|---|---|---|
| **Tech Stack** | `docs/architecture/tech-stack.md` | Locked technology matrix, versions, and exclusions rationale |
| **Data Models** | `docs/architecture/data-models.md` | Pydantic & domain entities with mandatory governance fields |
| **API Specification** | `docs/architecture/api-specification.md` | RESTful endpoints per FR, input/output schemas |
| **Database Schema** | `docs/architecture/database-schema.md` | Postgres DDL, relationships, indexes, and one-time seed mapping |
| **Components** | `docs/architecture/components.md` | Backend & frontend module boundaries, dependency graph |
| **Core Workflows** | `docs/architecture/core-workflows.md` | Recommendation scoring algorithm & LLM prompt workflows |
| **Source Tree** | `docs/architecture/source-tree.md` | Repository structure, code layout, and seed data paths |
| **Coding Standards** | `docs/architecture/coding-standards.md` | Python/FastAPI and TypeScript/React conventions & linting |
| **Deployment & Infra** | `docs/architecture/deployment-and-infrastructure.md` | Managed hosting (Render/Railway, Vercel, Supabase Postgres) |
| **Security & Privacy** | `docs/architecture/security-and-privacy.md` | Minor data protection, consent, auditability, and safety |
