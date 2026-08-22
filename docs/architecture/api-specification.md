# System Architecture: API Specification

## AI-Based Career Decision & Pathway Companion

**Document type:** Architecture shard — `docs/architecture/api-specification.md`  
**Status:** Approved Architectural Baseline  
**Source of truth:** `docs/Refined_PRD_AI_Career_Guidance.md` (Refined PRD v2.0)  
**Companion shards:** 
- `docs/architecture/tech-stack.md`
- `docs/architecture/data-models.md`
- `docs/architecture/components.md`
- `docs/architecture/core-workflows.md`

---

## 1. API Design Principles & Conventions

- **Protocol & Base URL:** HTTPS RESTful API at `/api/v1`.
- **Content Type:** `application/json` (UTF-8 encoded).
- **Authentication:** Bearer JWT in `Authorization: Bearer <token>` header issued via `python-jose`.
- **Validation:** Automatic request/response validation via **Pydantic v2.9** and OpenAPI 3.1 documentation auto-generated at `/docs`.
- **Error Format:** Standardized JSON error response with actionable messages.

---

## 2. API Endpoints Specification

### 2.1 Authentication & Consent Endpoints (FR-20)

#### `POST /api/v1/auth/register`
Registers a new user account.
- **Request Body:**
  ```json
  {
    "email": "student@example.com",
    "password": "SecurePassword123!",
    "full_name": "Rohan Sharma",
    "role": "student",
    "phone_number": "+919876543210"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "user_id": "8f3b6c20-a3e9-4e56-821f-82a1b94d1b91",
    "email": "student@example.com",
    "role": "student",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "token_type": "bearer"
  }
  ```

#### `POST /api/v1/auth/minor-consent`
Records guardian consent for minors (Class 8–10 / 11–12) per FR-20.
- **Request Body:**
  ```json
  {
    "student_profile_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "consent_type": "guardian_consent_minor",
    "guardian_email": "parent@example.com",
    "guardian_phone": "+919876500000",
    "guardian_signature_confirmed": true
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "status": "consent_recorded",
    "consent_recorded_at": "2026-08-21T06:45:00Z",
    "guardian_user_id": "3c5a1f2b-7e9a-4123-bc90-d4e5f6a7b8c9"
  }
  ```

---

### 2.2 Profile & Onboarding Endpoints (FR-01, FR-02, FR-03)

#### `POST /api/v1/profile`
Creates or updates student self-discovery context.
- **Request Body:**
  ```json
  {
    "education_stage": "class_11_12",
    "grade_or_year": "Class 12",
    "current_stream": "Science PCM",
    "interests": ["Data Analysis", "Coding", "Mathematics", "Problem Solving"],
    "aptitude_signals": {
      "favorite_subjects": ["Mathematics", "Physics", "Computer Science"],
      "self_reported_strengths": ["Logical Reasoning", "Quantitative Aptitude"],
      "academic_marks_band": "80-90%"
    },
    "work_style_preferences": {
      "team_preference": "collaborative",
      "work_environment": "tech_office_or_hybrid"
    },
    "budget_tier": "moderate_up_to_2_lakhs",
    "relocation_willingness": "within_state",
    "preferred_languages": ["English", "Hindi"]
  }
  ```
- **Response `200 OK`:** Returns serialized `StudentProfile` with `profile_completeness_pct: 90`.

#### `POST /api/v1/profile/guardian`
Submits separate guardian priorities (FR-03).
- **Request Body:**
  ```json
  {
    "guardian_name": "Sunita Sharma",
    "relationship_to_student": "Mother",
    "guardian_priorities": ["Job Security", "Moderate Education Cost", "State Proximity"],
    "financial_ceiling_inr": 150000,
    "relocation_restriction": "within_state",
    "notes_and_concerns": "Prefer government engineering college or established degree programs."
  }
  ```
- **Response `200 OK`:** Returns serialized `GuardianContext`.

---

### 2.3 Career Library & Comparison Endpoints (FR-04, FR-08, FR-11, FR-14)

#### `GET /api/v1/careers/{career_id}`
Fetches full career details including localized Indian entry routes, skills, market snapshot, and governance metadata.
- **Response `200 OK`:**
  ```json
  {
    "id": "data-scientist",
    "onet_soc_code": "15-2051.00",
    "title": "Data Scientist",
    "cluster": "Data & Artificial Intelligence",
    "description": "Develop and implement algorithms and statistical models to analyze complex datasets...",
    "work_reality_summary": "High analytical focus, significant time spent data cleaning, iterative modeling, business presentation.",
    "applicable_stages": ["class_11_12", "early_college"],
    "job_zone": 4,
    "riasec_code": "IRC",
    "india_entry_routes": [
      {
        "route_name": "B.Tech in Computer Science / AI & Data Science",
        "duration_years": 4,
        "entrance_exams": ["JEE Main", "MHT-CET", "CUET"],
        "cost_tier": "moderate_up_to_2_lakhs",
        "estimated_cost_inr_min": 200000,
        "estimated_cost_inr_max": 800000,
        "degree_or_cert_awarded": "B.Tech",
        "low_cost_alternative_route": "B.Sc in Statistics/CS in Govt College + NPTEL certification"
      }
    ],
    "skills": [
      {
        "skill_name": "Python Programming",
        "category": "essential",
        "free_learning_resource_name": "NPTEL Python for Data Science (IIT Madras)",
        "free_learning_resource_url": "https://nptel.ac.in/courses/106106182",
        "commercial_disclosure": "Independent public resource. No commercial commission."
      }
    ],
    "market_snapshot": {
      "geography": "India - Major Tech Hubs (Bengaluru, Pune, Hyderabad, Gurgaon, Mumbai)",
      "timeframe_period": "Sample of 47,193 Naukri job postings (2025-2026)",
      "demand_indicator": "High",
      "salary_range_entry_inr": "₹4,00,000 - ₹7,50,000 / annum",
      "salary_range_mid_inr": "₹10,00,000 - ₹20,00,000 / annum",
      "competition_caveat": "Entry-level competition is fierce; practical project portfolio required.",
      "uncertainty_statement": "Job market trends reflect recent posting volume and do not guarantee future hiring.",
      "last_updated_date": "2026-08-20"
    },
    "content_owner": "Career Content Team",
    "last_reviewed_date": "2026-08-20",
    "source_links": ["https://www.onetcenter.org/", "https://aicte-india.org/"]
  }
  ```

#### `POST /api/v1/careers/compare`
Side-by-side comparison of 2 to 3 selected careers (FR-08).
- **Request Body:**
  ```json
  {
    "career_ids": ["data-scientist", "software-engineer", "data-analyst"]
  }
  ```
- **Response `200 OK`:** Matrix comparing duration, cost range, prerequisites, and demand caveats side-by-side.

---

### 2.4 Recommendations & Decision Endpoints (FR-05, FR-06, FR-07, FR-09)

#### `POST /api/v1/recommendations/evaluate`
Triggers the deterministic weighted-sum scoring engine and creates a new `RecommendationBatch`.
- **Response `200 OK`:**
  ```json
  {
    "batch_id": "4b2e8d1a-9f5a-4b71-b8d2-5a9e3f1c7d0a",
    "batch_number": 1,
    "is_current": true,
    "recommendations": [
      {
        "id": "1c7a9f2e-3d4b-4a5c-9e8f-7b6a5c4d3e2f",
        "career_id": "data-scientist",
        "career_title": "Data Scientist",
        "rank_position": 1,
        "composite_score": 84.50,
        "fit_score": 88.00,
        "feasibility_score": 82.00,
        "evidence_quality_score": 90.00,
        "fit_label": "Strong",
        "feasibility_label": "High",
        "evidence_quality_label": "High",
        "reasons": [
          "Strong alignment with Mathematics and Coding interests (IRC RIASEC profile).",
          "Public engineering and affordable B.Sc pathways available within state."
        ],
        "concerns": [
          "High competition for top JEE-tier colleges; requires consistent math preparation."
        ],
        "missing_evidence_flags": [],
        "is_primary_selection": false,
        "is_backup_selection": false
      }
    ]
  }
  ```

#### `POST /api/v1/recommendations/select-pathways`
Selects primary and backup pathways or "continue exploring" state (FR-09).
- **Request Body:**
  ```json
  {
    "batch_id": "4b2e8d1a-9f5a-4b71-b8d2-5a9e3f1c7d0a",
    "primary_career_id": "data-scientist",
    "backup_career_id": "data-analyst",
    "decision_notes": "Aiming for Data Science via B.Tech, with Data Analyst via B.Sc as realistic fallback."
  }
  ```
- **Response `200 OK`:** Returns initialized `Roadmap` entity.

---

### 2.5 Roadmap & Execution Endpoints (FR-10, FR-11, FR-12)

#### `GET /api/v1/roadmap`
Fetches the active adaptive roadmap with all timeframe buckets and fallback branches.
- **Response `200 OK`:** Returns `Roadmap` and `roadmap_milestones` (7-day, 30-day, 90-day, 180-day).

#### `PATCH /api/v1/roadmap/milestones/{milestone_id}/complete`
Submits evidence of completion for a milestone.
- **Request Body:**
  ```json
  {
    "completion_evidence_type": "project_artifact",
    "completion_evidence_note_or_url": "https://github.com/student/intro-python-analysis"
  }
  ```
- **Response `200 OK`:** Updates milestone `is_completed = true` and unlocks dependent milestones.

---

### 2.6 Scholarship Endpoints (FR-13) - Seeded from Scholar-Spot Dataset

#### `GET /api/v1/scholarships`
Searches and filters verified government and private scholarship opportunities.
- **Query Parameters:**
  - `state` (string, optional, e.g. `"Maharashtra"`, `"All India"`)
  - `target_category` (string, optional, e.g. `"all"`, `"SC"`, `"ST"`, `"SEBC"`, `"EBC"`, `"open"`)
  - `min_qualification` (string, optional, e.g. `"FYJC"`, `"HSC"`, `"Graduation"`, `"Medical"`)
  - `income_ceiling_inr` (integer, optional, filters schemes where income limit $\ge$ user income)
  - `limit` (integer, default `20`)
  - `offset` (integer, default `0`)

- **Response `200 OK`:**
  ```json
  {
    "total_count": 48,
    "items": [
      {
        "id": 2,
        "name": "Assistance to Meritorious Students scholarship - Junior Level",
        "state": "Maharashtra",
        "sponsor_type": "Government",
        "target_category": "all",
        "income_ceiling_inr": 0,
        "min_qualification": "FYJC",
        "amount_description": "Scholarship of up to INR 2,300 for Class 11 & 12 students pursuing higher education.",
        "eligibility_summary": "Open to meritorious Class 11 & 12 students in Maharashtra. No annual family income restriction.",
        "deadline_description": "Annual MahaDBT portal cycle (typically October-December)",
        "required_documents": [
          "Income Certificate",
          "Domicile Certificate",
          "Class 10 Mark Sheet",
          "Aadhaar Card"
        ],
        "official_source_url": "https://mahadbt.maharashtra.gov.in/login/login",
        "last_verified_date": "2026-08-20",
        "renewal_conditions": "Satisfactory academic progress in Class 12",
        "is_active": true
      },
      {
        "id": 4,
        "name": "Dr Panjabrao Deshmukh Hostel Maintenance Allowance",
        "state": "Maharashtra",
        "sponsor_type": "Government",
        "target_category": "SEBC",
        "income_ceiling_inr": 800000,
        "min_qualification": "Medical",
        "amount_description": "Hostel maintenance allowance for professional & medical degree students.",
        "eligibility_summary": "SEBC category students in government-aided/private medical & professional colleges with annual income up to INR 8,00,000.",
        "deadline_description": "Annual MahaDBT portal cycle (typically October-December)",
        "required_documents": [
          "Income Certificate",
          "Caste Certificate",
          "Hostel Proof",
          "Admission Allotment Letter",
          "Aadhaar Card"
        ],
        "official_source_url": "https://mahadbt.maharashtra.gov.in/login/login",
        "last_verified_date": "2026-08-20",
        "renewal_conditions": "Passing marks in annual university examination",
        "is_active": true
      }
    ]
  }
  ```

#### `GET /api/v1/scholarships/{id}`
Retrieves full details and mandatory governance metadata for a single scholarship.
- **Response `200 OK`:** Returns individual `Scholarship` object matching `data-models.md`.

---

### 2.7 Grounded Career Q&A Chatbot (FR-16)

#### `POST /api/v1/chat/message`
Single-turn, grounded Q&A query against approved career context.
- **Request Body:**
  ```json
  {
    "question_text": "What is the entrance exam and typical fee for Data Science in Maharashtra?"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "interaction_id": "7d9e1f3a-2b4c-4d5e-8f9a-1b2c3d4e5f6a",
    "answer_text": "In Maharashtra, the primary entrance routes for Data Science engineering are MHT-CET (State CET) and JEE Main. In government colleges (like COEP or VJTI), annual fees range from INR 70,000 to 90,000, while private FRA-approved institutions range from INR 1.2 to 2.5 Lakhs per year. Scholarships like EBC and Dr. Panjabrao Deshmukh allowance are available for eligible categories.",
    "citations": [
      "O*NET / AICTE Maharashtra Entry Routes (2026)",
      "MahaDBT Scholarship Framework"
    ],
    "career_ids_injected": ["data-scientist", "data-analyst"],
    "was_escalated": false
  }
  ```

---

### 2.8 Guardian & Parent Summary Endpoints (FR-17)

#### `GET /api/v1/guardian/summary`
Retrieves the persisted plain-language summary for the student's active recommendation batch.
- **Response `200 OK`:**
  ```json
  {
    "student_name": "Rohan Sharma",
    "recommendation_batch_id": "4b2e8d1a-9f5a-4b71-b8d2-5a9e3f1c7d0a",
    "generated_at": "2026-08-21T06:50:00Z",
    "summary_text": "Rohan shows strong alignment with Data Science and Analytical Technology, driven by his interest in Mathematics and Problem Solving. A realistic pathway is a 4-year Engineering degree (via MHT-CET or JEE Main) with estimated tuition of ₹75,000–₹1,50,000/yr in state-aided institutions. As a realistic backup, a 3-year B.Sc in Statistics/CS provides a lower-cost alternative under ₹30,000/yr. Both paths fall comfortably within your stated family budget."
  }
  ```

---

### 2.9 Counselor Escalation Endpoints (FR-15, PRD Section 14)

#### `POST /api/v1/escalations/trigger`
Creates a human counselor review ticket.
- **Request Body:**
  ```json
  {
    "trigger_reason": "student_parent_deadlock",
    "notes": "Student prefers Design, guardian insists on Engineering. Need mediated discussion."
  }
  ```
- **Response `201 Created`:** Returns `CounselorEscalation` with status `pending`.

#### `POST /api/v1/counselor/review/{escalation_id}`
Counselor submits review verdict and override (Counselor RBAC only).
- **Request Body:**
  ```json
  {
    "counselor_notes": "Met with student and mother. Agreed on UI/UX Design within Computer Applications (BCA/B.Des).",
    "counselor_override_decision": "Recommend UI/UX Design as Primary, BCA as Backup",
    "counselor_override_rationale": "High visual-spatial aptitude; student willing to take technical design electives."
  }
  ```
- **Response `200 OK`:** Updates escalation status to `overridden` or `resolved`.
