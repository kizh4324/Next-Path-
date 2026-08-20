# Architecture Spine — AI-Based Personalized Career Guidance Platform
**Status:** Adopted / Final  
**Date:** 2026-08-19  
**Full Specification Document:** [ARCHITECTURE.md](file:///c:/Users/User/OneDrive/Music/Next_Path/docs/architecture/ARCHITECTURE.md)

## Invariant Architecture Decisions (ADs)
- **AD-001 [ADOPTED]:** Architecture Style — Modular Monolith with Asynchronous Workers (BullMQ) & Transactional Outbox.
- **AD-002 [ADOPTED]:** Primary Persistence — PostgreSQL 16 with multi-schema domain isolation and `pgvector` for CMS embeddings.
- **AD-003 [ADOPTED]:** Deterministic Recommendation Engine — Pure mathematical multi-stage scoring & constraint matrix. Zero LLM hallucinations in pathway selection.
- **AD-004 [ADOPTED]:** Grounded RAG Assistant — Strict RAG querying published, non-expired CMS content only with mandatory citations.
- **AD-005 [ADOPTED]:** Resilient Low-Bandwidth & Offline PWA — IndexedDB local storage with resumable assessment state machine.
- **AD-006 [ADOPTED]:** Event Infrastructure — Transactional Outbox pattern with Redis BullMQ.
- **AD-007 [ADOPTED]:** Categorical Rating Discretization — Fit, Feasibility, and Evidence Quality categorized as Strong, Moderate, Emerging, Insufficient Evidence (no pseudo-precise percentages).
- **AD-008 [ADOPTED]:** Minor Privacy & Guardian Consent — DPDP Act 2023 compliant OTP verification and cryptographic audit logging.
- **AD-009 [ADOPTED]:** Content Governance — 7-stage lifecycle with hard expiration dates and automated vector search eviction.
- **AD-010 [ADOPTED]:** Cost Architecture — Token budgets, LiteLLM router, semantic caching (< ₹2.80 INR/student/month).
- **AD-011 [ADOPTED]:** Observability — OpenTelemetry distributed tracing and Prometheus metrics with strict PII scrubbing.
- **AD-012 [ADOPTED]:** Frontend Design System — Next.js 14 App Router + Vanilla CSS Modules adhering to design system tokens.
