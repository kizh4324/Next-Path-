# System Architecture: Repository Source Tree

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/source-tree.md`  
**Status:** Approved Architectural Baseline  
**Source of truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Design system source:** `docs/AI_Career_Guidance_Design_System-6.md` (Design System v6)  
**Companion shards:** 
- `docs/architecture/tech-stack.md`
- `docs/architecture/database-schema.md`
- `docs/architecture/coding-standards.md`

---

## 1. Top-Level Directory Layout

```
Next_Path/
├── .github/                      # GitHub Actions CI workflows (lint, test)
├── backend/                      # Python 3.12 / FastAPI Backend Application
├── frontend/                     # React 18 / TypeScript / Vite Frontend Application
├── data/                         # Seed data & deterministic mapping dictionaries
│   └── seed/
├── docs/                         # Specifications & Sharded Architecture
│   ├── architecture/             # Sharded Architecture Documentation
│   ├── Refined_PRD_AI_Career_Guidance.md # Source PRD v2.0
│   └── AI_Career_Guidance_Design_System-6.md # UI Tokens & Design System v6
├── docker-compose.yml            # Local dev environment (Postgres 16 + Backend + Frontend)
├── .env.example                  # Environment variable template
├── .gitignore                    # Standard Python/Node/IDE ignore rules
└── README.md                     # Project overview & quick-start guide
```

---

## 2. Backend Directory Layout (`/backend`)

```
backend/
├── app/
│   ├── core/                     # Core system configuration & security
│   │   ├── config.py             # Pydantic BaseSettings (DB URL, JWT Secret, Anthropic API Key)
│   │   ├── database.py           # SQLAlchemy 2.0 async engine & sessionmaker
│   │   ├── security.py           # JWT encoding/decoding, bcrypt password hashing
│   │   └── dependencies.py       # FastAPI dependency injection (get_db, get_current_user, get_counselor)
│   │
│   ├── models/                   # SQLAlchemy 2.0 ORM Declarative Models
│   │   ├── __init__.py
│   │   ├── user.py               # User table
│   │   ├── profile.py            # StudentProfile & GuardianContext tables
│   │   ├── catalog.py            # CareerLibrary, CareerSkill, Scholarship, MarketSnapshot
│   │   ├── recommendation.py     # RecommendationBatch, Recommendation, ParentSummary
│   │   ├── roadmap.py            # Roadmap & RoadmapMilestone tables
│   │   ├── chat.py               # ChatInteraction audit table
│   │   └── escalation.py         # CounselorEscalation table
│   │
│   ├── schemas/                  # Pydantic v2 Domain & DTO Validation Schemas
│   │   ├── __init__.py
│   │   ├── auth.py               # Token, LoginRequest, RegisterRequest, MinorConsentRequest
│   │   ├── profile.py            # StudentProfileCreate, StudentProfileResponse, GuardianContextDTO
│   │   ├── catalog.py            # CareerDetailDTO, CareerSkillDTO, ScholarshipDTO, MarketSnapshotDTO
│   │   ├── recommendation.py     # RecommendationBatchResponse, RecommendationDTO, PathwaySelectRequest
│   │   ├── roadmap.py            # RoadmapResponse, MilestoneCompleteRequest
│   │   ├── chat.py               # ChatMessageRequest, ChatMessageResponse
│   │   ├── parent_summary.py     # ParentSummaryResponse
│   │   └── escalation.py         # EscalationCreateRequest, EscalationReviewRequest
│   │
│   ├── modules/                  # Business Logic & Service Boundary Layer
│   │   ├── auth_service.py       # Auth logic & minor consent verification
│   │   ├── scoring_engine.py     # Deterministic plain-Python weighted-sum algorithm
│   │   ├── roadmap_service.py    # Adaptive milestone builder & fallback generator
│   │   ├── llm_client.py         # Anthropic Claude Messages client (single-turn API wrapper)
│   │   ├── chatbot_service.py    # Grounded Q&A prompt assembler & crisis filter
│   │   ├── parent_summary_service.py # Plain-language guardian summary generator
│   │   └── escalation_service.py # Automated trigger rules & triage routing
│   │
│   ├── api/                      # FastAPI Route Controllers
│   │   ├── __init__.py
│   │   ├── router.py             # Main APIRouter aggregating all module endpoints
│   │   └── v1/
│   │       ├── auth.py           # /api/v1/auth/*
│   │       ├── profile.py        # /api/v1/profile/*
│   │       ├── careers.py        # /api/v1/careers/*
│   │       ├── recommendations.py# /api/v1/recommendations/*
│   │       ├── roadmap.py        # /api/v1/roadmap/*
│   │       ├── scholarships.py   # /api/v1/scholarships/*
│   │       ├── chat.py           # /api/v1/chat/*
│   │       ├── guardian.py       # /api/v1/guardian/*
│   │       └── counselor.py      # /api/v1/counselor/*
│   │
│   ├── main.py                   # FastAPI Application Factory & Middleware setup
│   └── alembic/                  # Database Migration Scripts
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
│
├── data/
│   └── seed_runner.py            # CLI seed ingestion script: python -m backend.data.seed_runner
│
├── tests/                        # Backend Pytest Test Suite
│   ├── conftest.py               # Test DB fixture, client fixture, mock tokens
│   ├── test_auth.py
│   ├── test_scoring_engine.py    # Unit tests for weighted-sum calculations & cutoffs
│   ├── test_chatbot_grounding.py # Verification of negative grounding & injection logging
│   └── test_api_endpoints.py
│
├── Dockerfile                    # Python 3.12-slim container configuration
├── pyproject.toml                # Dependencies & tool configurations (ruff, pytest)
└── requirements.txt              # Pinned pip dependencies matching tech-stack.md
```

---

## 3. Frontend Directory Layout (`/frontend`)

```
frontend/
├── public/                       # Static public assets & PWA icons
│   ├── favicon.ico
│   ├── manifest.json             # PWA web manifest
│   └── robots.txt
│
├── src/
│   ├── assets/                   # SVG icons & decorative illustration assets
│   ├── components/               # Reusable UI Component Library
│   │   ├── ui/                   # Primitive Design System v6 Elements
│   │   │   ├── Button.tsx        # Primary blue / secondary / ghost buttons
│   │   │   ├── Card.tsx          # Pure white surface card with subtle border
│   │   │   ├── Badge.tsx         # Decorative colored category badges
│   │   │   ├── MatchScoreBadge.tsx # 3-label Fit/Feasibility/Evidence badge
│   │   │   ├── Modal.tsx
│   │   │   └── Input.tsx
│   │   │
│   │   ├── layout/               # Layout Shells
│   │   │   ├── AppHeader.tsx     # Navigation header with profile status
│   │   │   ├── AppLayout.tsx     # Container layout with warm canvas-soft background
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── career/               # Career Library & Comparison Components
│   │   │   ├── CareerCard.tsx    # Standard occupational card with Indian entry routes
│   │   │   ├── ComparisonTable.tsx # Side-by-side comparison matrix (FR-08)
│   │   │   └── SkillList.tsx     # Essential / Useful / Optional skill breakdown
│   │   │
│   │   ├── roadmap/              # Roadmap & Execution Components
│   │   │   ├── RoadmapTimeline.tsx # Vertical 30/90/180-day milestone timeline
│   │   │   ├── MilestoneCard.tsx # Milestone details, free resources, and proof submission
│   │   │   └── FallbackDropdown.tsx # Branching action selector
│   │   │
│   │   └── chat/                 # Grounded Chatbot Components
│   │       ├── ChatbotFAB.tsx    # Floating Action Button with AI decorative accent (#391c57)
│   │       └── ChatbotDrawer.tsx # Slide-over grounded career Q&A drawer
│   │
│   ├── views/                    # Top-Level Page Views
│   │   ├── OnboardingWizard.tsx  # Stage-aware multi-step onboarding + minor consent
│   │   ├── ResultsDashboard.tsx  # Multi-option recommendation shortlist (FR-05)
│   │   ├── CareerDetailView.tsx  # Single career deep-dive
│   │   ├── CareerComparisonView.tsx # Side-by-side comparison page
│   │   ├── RoadmapView.tsx       # Interactive execution plan & progress tracker
│   │   ├── GuardianSummaryView.tsx # Plain-language parent overview (FR-17)
│   │   └── CounselorQueueView.tsx# Counselor triage & override portal (FR-15)
│   │
│   ├── hooks/                    # Custom React Hooks
│   │   ├── useAuth.ts            # Authentication state & JWT handling
│   │   ├── useRecommendations.ts # TanStack Query hooks for recommendations
│   │   ├── useRoadmap.ts         # Milestone completion & progress hooks
│   │   └── useChatbot.ts         # Chat interaction management
│   │
│   ├── services/                 # HTTP API Client
│   │   ├── api_client.ts         # Axios/fetch wrapper with JWT injection & error handling
│   │   └── endpoints.ts          # Strongly typed endpoint definitions
│   │
│   ├── types/                    # TypeScript Type Definitions & Zod Schemas
│   │   ├── models.ts             # Mirrored Pydantic data models
│   │   └── forms.ts              # Zod validation schemas for forms
│   │
│   ├── App.tsx                   # React Router 6 route tree
│   ├── main.tsx                  # Application entry point with TanStack Query provider
│   └── index.css                 # Tailwind CSS directives & Design System v6 font imports
│
├── index.html                    # Root HTML document
├── tailwind.config.js            # Tailwind token mappings (colors, typography, spacing)
├── tsconfig.json                 # TypeScript 5.6 configuration
├── vite.config.ts                # Vite 5.4 build configuration + vite-plugin-pwa
├── package.json                  # Pinned dependencies matching tech-stack.md
└── Dockerfile                    # Multi-stage Nginx build for static SPA
```

---

## 4. Seed Data Directory (`/data/seed`)

```
data/
└── seed/
    ├── mappings/
    │   ├── naukri_title_to_career_map.json # Manual SME mapping: Job_Titles -> career_library.id
    │   └── onet_skill_tier_overrides.json   # Content owner curriculum overrides for skill tiers
    ├── seed_scholarships.csv                # Scholar-Spot Indian scholarships CSV (dataset.csv)
    ├── seed_market_snapshots.csv            # Sourced & aggregated from Naukri India postings
    ├── seed_career_clusters.json            # Localized O*NET occupational catalogue with Indian routes
    └── seed_runner.py                       # CLI seed runner script with database transaction safety
```
