# System Architecture: Core Workflows & Logic

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/core-workflows.md`  
**Status:** Approved Architectural Baseline  
**Source of truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Companion shards:** 
- `docs/architecture/tech-stack.md`
- `docs/architecture/data-models.md`
- `docs/architecture/database-schema.md`
- `docs/architecture/components.md`

---

## 1. Recommendation Engine Scoring Workflow (FR-05, FR-06, FR-07)

In strict accordance with the locked **Tech Stack**, the recommendation engine is implemented in **plain Python without machine learning frameworks or vector retrieval**. Every output score is an inspectable, auditable calculation that directly produces the 3-label breakdown required by PRD FR-07.

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

### 1.1 Mathematical Formulation

For each career $c \in \text{CareerLibrary}$ against student profile $s \in \text{StudentProfile}$:

#### 1. Personal Fit Score ($\text{Fit}(s, c) \in [0, 100]$):
$$\text{Fit}(s, c) = 0.60 \cdot \text{RIASEC\_Alignment}(s, c) + 0.40 \cdot \text{Aptitude\_Signal\_Match}(s, c)$$
- $\text{RIASEC\_Alignment}(s, c)$: Dot-product similarity between normalized student interest vectors and career Holland scores.
- $\text{Aptitude\_Signal\_Match}(s, c)$: Overlap score between student-reported favorite subjects / self-reported strengths and the career's prerequisite knowledge domains.

#### 2. Practical Feasibility Score ($\text{Feas}(s, c) \in [0, 100]$):
$$\text{Feas}(s, c) = 0.45 \cdot \text{Budget\_Compatibility}(s, c) + 0.35 \cdot \text{Relocation\_Fit}(s, c) + 0.20 \cdot \text{Stage\_Eligibility}(s, c)$$
- $\text{Budget\_Compatibility}$: Evaluates if any Indian entry route for career $c$ falls within the family's `budget_tier` / `financial_ceiling_inr`. (100 if entry route cost $\le$ budget; penalized proportionally if cost exceeds budget unless high-value scholarships exist).
- $\text{Relocation\_Fit}$: 100 if education/jobs exist within `relocation_willingness`; 40 if career requires relocation beyond student's allowed boundary.
- $\text{Stage\_Eligibility}$: 100 if student's `education_stage` and stream satisfy career prerequisites; 50 if bridge/remedial courses are required.

#### 3. Evidence Quality Score ($\text{Evid}(s) \in [0, 100]$):
$$\text{Evid}(s) = 0.70 \cdot \text{profile\_completeness\_pct} + 0.30 \cdot (100 \text{ if } \text{academic\_records\_available} \text{ else } 40)$$

#### 4. Composite Score ($\text{Composite}(s, c) \in [0, 100]$):
$$\text{Composite}(s, c) = \max\Big(0.0, \, 0.55 \cdot \text{Fit}(s, c) + 0.45 \cdot \text{Feas}(s, c) - 0.10 \cdot (100 - \text{Evid}(s))\Big)$$

---

### 1.2 Categorical Label Assignment Rules (FR-07)

To prevent misinterpretation of bare numbers, scores map to standardized labels:

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

## 2. LLM Call #1: Grounded Career Q&A Chatbot Workflow (FR-16)

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

### System Prompt Template for Chatbot (Strict Boundary Enforcement):
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

## 3. LLM Call #2: Parent Summary Generation Workflow (FR-17)

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

## 4. Reassessment & Historical Preservation Workflow (FR-18)

When a student updates their profile or completes a scheduled review:

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

## 5. Seed Data Ingestion & Transformation Workflow

```mermaid
flowchart TD
    Start([Execute `python -m backend.data.seed_db`]) --> ReadNaukri[Read Naukri Job Postings CSV]
    ReadNaukri --> LoadNaukriMap[Load /data/seed/mappings/naukri_title_to_career_map.json]
    LoadNaukriMap --> MatchTitles{Is Title in Lookup Map?}
    MatchTitles -- Yes --> AggregateNaukri[Aggregate Skills Frequency & Salary Bands by career_id]
    MatchTitles -- No --> LogUnmapped[Log to unmapped_titles.log for SME Review]
    AggregateNaukri --> InsertMarket[Insert into market_snapshots table]

    Start --> ReadONet[Read O*NET v30.3 essential_skills.csv]
    ReadONet --> NormScores[Normalize Scores: norm = (raw - 1.0) / 4.0 * 100]
    NormScores --> ApplyTiers[Assign Category: >=70 Essential, 50-69 Useful, <50 Optional]
    ApplyTiers --> LoadONetOverrides[Apply /data/seed/mappings/onet_skill_tier_overrides.json]
    LoadONetOverrides --> InsertSkills[Insert into career_skills table]

    Start --> ReadScholarships[Read Scholar-Spot CSV]
    ReadScholarships --> CleanScholarships[Strip header spaces, map LINKS to official_source_url, add governance dates]
    CleanScholarships --> InsertScholarships[Insert into scholarships table]
```
