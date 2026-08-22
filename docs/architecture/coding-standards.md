# System Architecture: Coding Standards & Conventions

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/coding-standards.md`  
**Status:** Approved Architectural Baseline  
**Source of truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Design system source:** `docs/AI_Career_Guidance_Design_System-6.md` (Design System v6)  
**Companion shards:** 
- `docs/architecture/tech-stack.md`
- `docs/architecture/data-models.md`
- `docs/architecture/source-tree.md`

---

## 1. Backend Standards (Python 3.12 / FastAPI / Pydantic)

### 1.1 Code Formatting & Tooling
- **Formatter & Linter:** `ruff` with line length limit of 100 characters.
- **Type Checking:** Strict static typing with `mypy`. All function arguments and return values must carry explicit type annotations.

### 1.2 Pydantic & Domain Modeling Rules
1. **Pydantic v2 Syntax:** Always use Pydantic v2 idioms:
   - `model_config = ConfigDict(from_attributes=True, extra="forbid")`
   - Use `Field(description="...")` for self-documenting OpenAPI schemas.
2. **Governance Field Enforcement:** Never mark mandatory PRD Section 13 governance fields (e.g. `official_source_url`, `last_verified_date`, `competition_caveat`) as `Optional` in domain models.
3. **No Speculative Logic:** Scoring engine functions must be pure, deterministic Python functions with zero external network or ML dependencies.

### 1.3 FastAPI Architecture & Endpoints
1. **Async Endpoints:** All I/O operations (database access, Anthropic API calls) must use `async`/`await`.
2. **Dependency Injection:** Database sessions (`get_db`) and authenticated users (`get_current_user`, `get_counselor_user`) must be resolved via FastAPI's `Depends()`.
3. **Explicit Error Handling:**
   - Always throw standardized `HTTPException(status_code=..., detail=...)`.
   - Never catch bare `except:`; catch specific exceptions and log with standard `logging`.
   - Return RFC 7807 problem details format on error.

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

## 2. Frontend Standards (React 18 / TypeScript / Tailwind)

### 2.1 TypeScript & Type Safety
- **Strict Mode:** `tsconfig.json` must enforce `"strict": true`, `"noImplicitAny": true`.
- **No `any` Policy:** Explicit interfaces or Zod-inferred types must be defined for every component prop, API response, and hook state.
- **Domain Type Mirroring:** Frontend TypeScript interfaces under `src/types/models.ts` must exactly mirror backend Pydantic models.

### 2.2 React Architecture & State Management
1. **Functional Components Only:** Use React 18 functional components with named exports.
2. **Server State via TanStack Query:**
   - All backend queries and mutations must use TanStack Query hooks (`useQuery`, `useMutation`).
   - Invalidate cache keys precisely on mutation (e.g. `["recommendations", studentId]`).
3. **Form Handling with Zod:**
   - Multi-step forms must use `react-hook-form` paired with `@hookform/resolvers/zod`.
   - Validation schemas live in `src/types/forms.ts`.

### 2.3 Styling Discipline (Design System v6 Tokens)
1. **No Ad-Hoc Hex Codes in Components:** Strictly use Tailwind classes configured from `docs/AI_Career_Guidance_Design_System-6.md`:
   - Structural CTA: `bg-primary hover:bg-primary-active text-on-primary` (`#0075de`).
   - Page Canvas: `bg-canvas-soft` (`#f6f5f4`).
   - Surface Cards: `bg-surface border border-hairline` (`#ffffff`, border `#e6e6e6`).
   - Primary Text: `text-ink` (`#000000`), secondary `text-ink-secondary` (`#31302e`), muted `text-ink-muted` (`#615d59`).
   - AI Decorative Highlights: `bg-ai-accent text-ai-accent-soft` (`#391c57` / `#d6b6f6`).
2. **Accessible Contrast:** All text pairings must meet WCAG AA (4.5:1) standards.

---

## 3. Testing Conventions & Quality Gates

| Layer | Framework | Minimum Standard | Target Areas |
|---|---|---|---|
| **Backend Unit Tests** | `pytest` | 80%+ coverage on core logic | `scoring_engine.py`, cutoff threshold assignments, validation schemas. |
| **Backend API Tests** | `pytest` + `httpx.AsyncClient` | 100% endpoint pass rate | Auth flows, minor consent validation, career lookup, error responses. |
| **Frontend Unit Tests** | `vitest` + React Testing Library | Key component rendering | `MatchScoreBadge.tsx`, `RoadmapTimeline.tsx`, `CareerCard.tsx`. |
| **CI Automation** | GitHub Actions | Block merge on lint/test failure | `ruff check`, `mypy`, `pytest`, `npm run typecheck`, `vitest run`. |
