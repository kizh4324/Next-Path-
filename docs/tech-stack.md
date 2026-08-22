# Tech Stack

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/tech-stack.md`
**Status:** Definitive technology selection. This document is the single source of truth for all technology choices on this project — dev agents load this file directly (per `core-config.yaml` → `devLoadAlwaysFiles`) and must not introduce a library, framework, or service that isn't listed here without updating this document first.
**Source of truth for requirements:** `docs/prd.md` (Refined PRD v2.0) — every row below is traceable to a specific FR or MVP-scope line, not a default preference.
**Companion shards:** `docs/architecture/coding-standards.md`, `docs/architecture/source-tree.md`

---

## 1. Technology Selection Principles

1. **No speculative infrastructure.** A technology is only added when a specific PRD requirement (Section 12 or Section 20) needs it — not because it's common in similar products.
2. **Exact versions, pinned.** No `latest`, no unpinned `^` ranges left to drift in production. Versions below are the pinned baseline; update this table (not just the lockfile) when a version changes.
3. **Explainability over black-box ML.** Per FR-06/FR-07, the recommendation logic must be inspectable. This ruled out ML-based recommenders and RAG-based retrieval at MVP stage — see Section 4 for the explicit rationale.
4. **One deployment target class per layer.** Managed platforms (not raw VMs/Kubernetes) at pilot scale, to match MVP timeline and team size.

---

## 2. Definitive Technology Selections

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
| LLM Provider | Anthropic API (Claude) | Messages API, current stable model | Career Q&A chatbot (FR-16) + parent-summary generation (FR-17) | Two narrow, direct API calls — not an agent framework. See Section 4. |
| Recommendation Engine | Plain Python (no ML framework) | — | Career-fit scoring (FR-05/06/07) | Weighted-sum scoring function with inspectable component scores — see Section 4. |
| Testing (backend) | Pytest + httpx | pytest 8.3.x / httpx 0.27.x | API and logic tests | Standard Python testing stack; httpx for FastAPI endpoint tests. |
| Testing (frontend) | Vitest + React Testing Library | vitest 2.1.x / RTL 16.0.x | Component/unit tests | Pairs natively with Vite; avoids adding Jest's separate config layer. |
| Containerization | Docker + Docker Compose | Docker Engine 27.x | Local dev + reproducible builds | Single `docker-compose.yml` (frontend, backend, Postgres) for consistent local/demo environments. |
| Frontend Hosting | Vercel or Netlify | — | Static/SPA hosting | Managed platform; no infra provisioning needed at pilot scale. |
| Backend Hosting | Render or Railway | — | API hosting | Managed container hosting; avoids raw VM/Kubernetes setup for MVP timeline. |
| Database Hosting | Managed Postgres (Render/Railway/Supabase) | PostgreSQL 16.x | Hosted primary DB | Matches backend hosting choice; automated backups included. |
| Version Control | Git + GitHub | — | Source control | Standard; also hosts CI if added later. |
| Logging | Python `logging` (stdlib) + platform dashboards | — | Application logs | Platform-provided logs (Render/Vercel) are sufficient at pilot scale; no separate log-aggregation service required yet. |

---

## 3. Explicitly Excluded (and Why)

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

## 4. Notes on the Two Non-Obvious Decisions

**Recommendation engine is not an LLM call and not an ML model.**
FR-05/06/07 require 3–5 ranked career options with explicit reasons, concerns, and missing-evidence flags — and PRD Section 20 explicitly excludes "claims of psychometric accuracy before validation." A weighted-sum function (`score = w1·interest_match + w2·aptitude_match + w3·feasibility_score − penalty·missing_evidence`) makes every contributing factor a stored, auditable number, which satisfies the explainability requirement directly rather than requiring a separate explanation layer bolted onto a black-box model.

**LLM usage is scoped to exactly two calls, with no memory or agent loop.**
1. Career chatbot (FR-16): system prompt restricts answers to the career-library entries relevant to the student's query, injected directly into the prompt as plain text/JSON (this *is* the retrieval step — a database lookup by career ID, not a vector search).
2. Parent summary (FR-17): structured recommendation output goes in, one plain-language paragraph comes out — deterministic input, no chained reasoning steps.

Both are single-turn API calls against the LLM provider's standard Messages endpoint. No agent framework, tool-use loop, or persistent conversation memory is required for either.

---

## 5. Growth Triggers — When to Revisit This Table

| Trigger | What to add |
|---|---|
| Career library grows past what fits in an LLM context window (roughly hundreds of entries with long-form content) | Introduce `pgvector` or a dedicated vector DB for retrieval — Phase 2/3 per PRD Section 21. |
| Real concurrent-user load causes measured DB read latency | Introduce Redis as a server-side cache layer. |
| Phase 2 practical skill checks (FR-21) and project evidence (FR-22) produce enough labeled outcome data | Revisit a trained model for recommendation, alongside the counselor-validated outcome tracking required by PRD Section 13.5 before making stronger accuracy claims. |
| Background job volume exceeds what APScheduler can reliably handle in-process | Introduce Celery (or similar) with a broker (Redis/RabbitMQ). |
