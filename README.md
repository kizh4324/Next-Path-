# Next_Path

A career **decision-support companion** for Indian school and early-college students —
Class 8–10 choosing a stream, Class 11–12 choosing a degree and entrance path, and early
college correcting course.

It is deliberately **not** a prediction engine. It shows 3–5 options side by side, scores
them with a transparent weighted sum whose every component is stored and inspectable,
reports evidence quality separately from fit, and names what it does not know instead of
filling the gap with a confident-sounding guess.

---

## Quick start

```bash
git clone <this repo> && cd Next-Path-
cp .env.example .env          # optional: add ANTHROPIC_API_KEY

docker compose up --build     # backend :8000 · frontend :5173 · postgres :5432
```

Then, in a second terminal, load the catalogue:

```bash
docker compose exec backend python -m data.seed_runner
```

- App — <http://localhost:5173>
- API docs — <http://localhost:8000/docs>
- Health — <http://localhost:8000/health>

### Without Docker

```bash
# Backend (needs Python 3.12 and a PostgreSQL 16 you point DATABASE_URL at)
cd backend
python -m venv .venv && .venv/Scripts/activate     # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
python -m data.seed_runner
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

**The Anthropic API key is optional.** Without it the app runs end to end: the guardian
summary falls back to a deterministic template built from the stored figures, and the
chatbot returns an explicit "AI unavailable" state rather than an invented answer.

---

## What is here

| Path | Contents |
|---|---|
| [backend/](backend/) | FastAPI 0.115 · Python 3.12 · SQLAlchemy 2.0 · Alembic · PostgreSQL 16 |
| [frontend/](frontend/) | React 18 · TypeScript 5.6 · Vite 5.4 · Tailwind 3.4 · TanStack Query · PWA |
| [data/seed/](data/seed/) | Built catalogue artefacts + the authored mappings they come from |
| [Dataset/](Dataset/) | Raw third-party sources (O*NET 30.3, Naukri sample, Scholar-Spot) |
| [docs/](docs/) | PRD v2.0, 11 architecture shards, epics, UX spec, Design System v6 |

---

## How the recommendation works

A plain-Python weighted sum — no ML model, no vector search. Every contributing number
is persisted, so a counselor can inspect and dispute any result:

```text
Fit       = 0.60·RIASEC_alignment + 0.40·aptitude_signal_match
Feasibility = 0.45·budget_compatibility + 0.35·relocation_fit + 0.20·stage_eligibility
Evidence  = 0.70·profile_completeness + 0.30·(100 if records else 40)
Composite = max(0, 0.55·Fit + 0.45·Feasibility − 0.10·(100 − Evidence))
```

Scores map to labels (`Strong`/`Moderate`/`Emerging`/`Insufficient evidence`) so a bare
number is never presented as a verdict. The engine lives in
[scoring_engine.py](backend/app/modules/scoring_engine.py) and is pure — no database, no
network, no randomness — which is why it is exhaustively unit-tested at every cutoff.

---

## The seed pipeline

Authored content and machine-derived content are kept strictly separate, so it is always
clear which half of a career entry is human judgement:

```text
data/seed/mappings/india_career_authoring.json   authored: entry routes, exams,
                                                 INR costs, risks, regional caveats
Dataset/Career library/db_30_3_csv/              derived: description, Job Zone,
                                                 RIASEC vector, skill importance
        │
        ├── python -m data.build_career_seed        → seed_career_clusters.json
        ├── python -m data.build_market_seed        → seed_market_snapshots.json
        ├── python -m data.build_scholarship_seed   → seed_scholarships.json
        └── python -m data.seed_runner              → PostgreSQL (idempotent)
```

The builders are deterministic, and `--check` fails CI if a committed artefact has
drifted from its sources.

**Current catalogue:** 27 careers across 10 clusters · 324 skills, every one with a free
learning route · 96 scholarships · 2 market snapshots.

---

## Three limits the product states out loud

These are properties of the data, surfaced in the UI rather than hidden:

1. **Market evidence covers data roles only.** The Naukri sample is Data Science and Data
   Analytics postings. Every other career returns an explicit missing-evidence state —
   "we do not know", never "demand is low". Salary bands come from the ~6–8% of postings
   that actually disclosed a package, and each snapshot says so with the real numbers.
2. **Scholarships cover Maharashtra and All-India only** (62 + 34 of 96). A student from
   another state correctly sees an empty result plus a note explaining that this means
   *absent from our data*, not *no scheme exists*.
3. **Resource links point at portal roots**, not deep links that rot silently. Next_Path
   takes no commission from any listed provider, recorded per row in
   `career_skills.commercial_disclosure`.

---

## Development

```bash
# Backend
cd backend
ruff check .            # lint
mypy app data           # strict type check
pytest                  # 165 tests

# Frontend
cd frontend
npm run typecheck
npm run test
npm run build
```

CI runs all of the above plus a PostgreSQL 16 job that applies migrations, seeds twice
(proving idempotency), and rolls back to base.

---

## Safety

Crisis language in the chatbot is intercepted **before** any career logic and before any
network call, so a student in distress never waits on a round-trip. The response is a
fixed local message carrying Tele-MANAS (14416), KIRAN (1800-599-0019), and 112, and it
auto-raises a top-priority counselor ticket.

On account deletion, crisis-safety records are retained with `student_id` set to NULL and
all identifying fields scrubbed from the snapshot — a duty-of-care audit trail that
cannot be linked back to a person. This is disclosed to the student *before* they
confirm, not after.

---

## Attribution

Career data derives from the **O*NET 30.3 Database** (US Department of Labor,
CC BY 4.0), modified for Indian pathways. Full attributions and the list of
modifications are in [NOTICE.md](NOTICE.md) — required reading before redistributing.

The source code has no license file yet. Pick one before publishing.
