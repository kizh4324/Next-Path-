# System Architecture: Deployment & Infrastructure

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/deployment-and-infrastructure.md`  
**Status:** Approved Architectural Baseline  
**Source of truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Tech stack source:** `docs/architecture/tech-stack.md` (Locked)  
**Companion shards:** 
- `docs/architecture/security-and-privacy.md`
- `docs/architecture/source-tree.md`

---

## 1. Deployment Philosophy & Target Platforms

In strict compliance with the **Tech Stack**, the system avoids speculative container orchestration (e.g. Kubernetes, raw AWS EC2/ECS) and deploys exclusively on managed, production-grade PaaS solutions appropriate for pilot scale (1,000–50,000 students).

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

---

## 2. Infrastructure Topology Matrix

| Tier | Hosting Platform | Runtime / Config | Purpose | Rationale |
|---|---|---|---|---|
| **Frontend** | **Vercel** or **Netlify** | Node.js 20 build $\rightarrow$ Static SPA output | Hosts the React 18 SPA, static assets, and PWA service worker. | Zero server maintenance, instant global CDN delivery, automated branch previews. |
| **Backend API** | **Render** or **Railway** | Docker container (Python 3.12-slim + Uvicorn) | Executes FastAPI REST API, scoring engine, and LLM integrations. | Managed container hosting with automatic TLS, environment management, and horizontal auto-scaling. |
| **Database** | **Managed PostgreSQL (Supabase / Render)** | PostgreSQL 16.x (1 Primary, automated daily snapshots) | System of record for all profiles, catalog, recommendations, and audit logs. | Native JSONB indexing, ACID transactions, automated point-in-time recovery without DBA overhead. |
| **LLM Provider** | **Anthropic API** | Claude Messages API (HTTPS) | Powers single-turn Career Q&A (FR-16) and Parent Summary generation (FR-17). | Managed LLM inference; zero GPU infrastructure required. |

---

## 3. Environment Configuration & Variables

All configuration is managed via 12-factor environment variables validated via Pydantic `BaseSettings`:

```bash
# =============================================================================
# BACKEND ENVIRONMENT VARIABLES (.env)
# =============================================================================
ENVIRONMENT=production
DEBUG=false
PROJECT_NAME="Next_Path AI Career Companion"
API_V1_STR="/api/v1"

# Database Connection (Async SQLAlchemy)
DATABASE_URL=postgresql+asyncpg://nextpath_user:SecurePassword@db.host.render.com:5432/nextpath_prod

# Authentication & JWT
JWT_SECRET_KEY=e83a9f01b3d7c58e4129ab819023485712903487192834710923847102938471
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# LLM Integration (Anthropic)
# NOTE: ANTHROPIC_MODEL must be checked against Anthropic's current stable model list at deployment time, matching the pinned baseline in tech-stack.md.
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=<current-stable-model-see-tech-stack.md>

# CORS Whitelist
BACKEND_CORS_ORIGINS=["https://app.nextpath.in", "https://nextpath.vercel.app"]

# =============================================================================
# FRONTEND ENVIRONMENT VARIABLES (.env.production)
# =============================================================================
VITE_API_BASE_URL=https://api.nextpath.in/api/v1
VITE_APP_VERSION=1.0.0
```

---

## 4. Local Development Environment (`docker-compose.yml`)

Developers run the full stack locally with a single command:

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
