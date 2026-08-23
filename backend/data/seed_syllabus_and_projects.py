"""Data authoring and seed runner for Syllabi, Skill Projects, and Career Trajectories (Epic 7).

Provides structured curricula, tiered project specifications (Beginner, Intermediate, Advanced),
and career advancement/lateral progression vectors for all 27 occupational tracks in Next_Path.
"""

from __future__ import annotations

import logging
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import (
    CareerLibrary,
    CareerTopicSyllabus,
    CareerTrajectory,
    SkillProjectIdea,
)

logger = logging.getLogger(__name__)

# --- Career Data Definitions ---

SYLLABUS_DATA: dict[str, list[dict]] = {
    "software-developer": [
        {
            "phase_number": 1,
            "phase_title": "Phase 1: Programming & Problem Solving Foundations",
            "topics": [
                {
                    "topic_title": "Computational Thinking & Control Structures",
                    "description": "Variables, conditionals, loops, functions, and memory mental models.",
                    "key_concepts": ["Logic gates", "Flow control", "Recursion", "Big-O notation"],
                    "free_resource_name": "CS50: Introduction to Computer Science (Harvard/edX)",
                    "free_resource_url": "https://cs50.harvard.edu/x/",
                    "estimated_hours": 20,
                    "is_optional": False,
                },
                {
                    "topic_title": "Data Structures & Basic Algorithms",
                    "description": "Arrays, Linked Lists, Stacks, Queues, Hash Tables, and Sorting algorithms.",
                    "key_concepts": ["Hash Maps", "Binary Search", "Time/Space Complexity"],
                    "free_resource_name": "NPTEL - Programming, Data Structures and Algorithms in Python",
                    "free_resource_url": "https://nptel.ac.in/courses/106106145",
                    "estimated_hours": 30,
                    "is_optional": False,
                },
                {
                    "topic_title": "Version Control & Collaborative Git",
                    "description": "Git branching, pull requests, merge conflict resolution, and GitHub workflows.",
                    "key_concepts": ["Commit hygiene", "Rebase vs Merge", "SSH keys", "PR Reviews"],
                    "free_resource_name": "Pro Git Book (Free E-Book)",
                    "free_resource_url": "https://git-scm.com/book/en/v2",
                    "estimated_hours": 10,
                    "is_optional": False,
                },
            ],
        },
        {
            "phase_number": 2,
            "phase_title": "Phase 2: Full-Stack & API Engineering",
            "topics": [
                {
                    "topic_title": "Relational Databases & SQL Modeling",
                    "description": "Schema design, normalization, ACID transactions, indexing, and joins.",
                    "key_concepts": ["Foreign keys", "Indexing", "Query optimization", "Connection pooling"],
                    "free_resource_name": "PostgreSQL Official Tutorial",
                    "free_resource_url": "https://www.postgresql.org/docs/current/tutorial.html",
                    "estimated_hours": 25,
                    "is_optional": False,
                },
                {
                    "topic_title": "Backend Architecture & RESTful APIs",
                    "description": "HTTP protocol, status codes, authentication (JWT/OAuth), and asynchronous runtimes.",
                    "key_concepts": ["Statelessness", "Middleware", "CORS", "Rate limiting"],
                    "free_resource_name": "FastAPI / Node.js Official Documentation",
                    "free_resource_url": "https://fastapi.tiangolo.com/tutorial/",
                    "estimated_hours": 30,
                    "is_optional": False,
                },
                {
                    "topic_title": "Frontend Component Architecture",
                    "description": "DOM manipulation, reactive state, props, hooks, and responsive design systems.",
                    "key_concepts": ["Component hierarchy", "State lifting", "Tailwind CSS", "Accessibility"],
                    "free_resource_name": "freeCodeCamp Full-Stack Developer Certification",
                    "free_resource_url": "https://www.freecodecamp.org/learn",
                    "estimated_hours": 35,
                    "is_optional": False,
                },
            ],
        },
        {
            "phase_number": 3,
            "phase_title": "Phase 3: Production, Testing & Cloud Deployment",
            "topics": [
                {
                    "topic_title": "Automated Testing & Test-Driven Development",
                    "description": "Unit testing, integration testing, mocking, and end-to-end assertions.",
                    "key_concepts": ["Pytest / Jest", "Mocks & Stubs", "Coverage reports", "CI pipelines"],
                    "free_resource_name": "Python Testing with pytest (Official Guides)",
                    "free_resource_url": "https://docs.pytest.org/",
                    "estimated_hours": 15,
                    "is_optional": False,
                },
                {
                    "topic_title": "Containerization & CI/CD",
                    "description": "Docker images, multi-stage builds, compose files, and GitHub Actions automation.",
                    "key_concepts": ["Dockerfile optimization", "Volumes", "Environment secrets", "Docker Compose"],
                    "free_resource_name": "Docker Getting Started Guide",
                    "free_resource_url": "https://docs.docker.com/get-started/",
                    "estimated_hours": 20,
                    "is_optional": False,
                },
            ],
        },
    ],
    "ux-designer": [
        {
            "phase_number": 1,
            "phase_title": "Phase 1: Foundations of User Research & Heuristics",
            "topics": [
                {
                    "topic_title": "User Research Methodologies & Empathy",
                    "description": "Conducting qualitative interviews, creating user personas, and empathy maps.",
                    "key_concepts": ["Contextual inquiry", "Mental models", "Affinity mapping"],
                    "free_resource_name": "NPTEL - Interaction Design by IIT Guwahati",
                    "free_resource_url": "https://nptel.ac.in/courses/106103115",
                    "estimated_hours": 20,
                    "is_optional": False,
                },
                {
                    "topic_title": "Usability Heuristics & Interface Laws",
                    "description": "Nielsen Norman 10 Usability Heuristics, Fitts's Law, Hick's Law, and Gestalt Principles.",
                    "key_concepts": ["Heuristic evaluation", "Error prevention", "Recognition over recall"],
                    "free_resource_name": "Nielsen Norman Group Articles (Free Library)",
                    "free_resource_url": "https://www.nngroup.com/articles/ten-usability-heuristics/",
                    "estimated_hours": 15,
                    "is_optional": False,
                },
            ],
        },
        {
            "phase_number": 2,
            "phase_title": "Phase 2: Information Architecture & Wireframing",
            "topics": [
                {
                    "topic_title": "User Flows & Information Architecture",
                    "description": "Tree testing, card sorting, task flows, and sitemap navigation structuring.",
                    "key_concepts": ["Card sorting", "Navigation taxonomy", "Happy vs edge-case flows"],
                    "free_resource_name": "Interaction Design Foundation Free Articles",
                    "free_resource_url": "https://www.interaction-design.org/literature/topics/information-architecture",
                    "estimated_hours": 20,
                    "is_optional": False,
                },
                {
                    "topic_title": "Figma Mastery: Components, Grids & Auto-Layout",
                    "description": "Building responsive UI components, constraints, auto-layout, and design tokens.",
                    "key_concepts": ["8pt grid", "Design tokens", "Variants", "Interactive components"],
                    "free_resource_name": "Figma Official YouTube & Community Tutorials",
                    "free_resource_url": "https://help.figma.com/hc/en-us/categories/360002042553",
                    "estimated_hours": 30,
                    "is_optional": False,
                },
            ],
        },
        {
            "phase_number": 3,
            "phase_title": "Phase 3: Design Systems, Testing & Portfolio Case Studies",
            "topics": [
                {
                    "topic_title": "Accessible Design (WCAG AA Compliance)",
                    "description": "Color contrast ratios, screen reader semantics, focus states, and scalable typography.",
                    "key_concepts": ["WCAG 2.1 AA", "Color blindness simulation", "Keyboard navigation"],
                    "free_resource_name": "W3C Web Accessibility Initiative (WAI)",
                    "free_resource_url": "https://www.w3.org/WAI/fundamentals/accessibility-intro/",
                    "estimated_hours": 15,
                    "is_optional": False,
                },
                {
                    "topic_title": "Usability Testing & Case Study Storytelling",
                    "description": "Drafting test scripts, SUS scoring, synthesizing insights, and publishing portfolio decks.",
                    "key_concepts": ["Task completion rate", "SUS metric", "Problem-Impact-Solution framing"],
                    "free_resource_name": "Case Study Club Guides",
                    "free_resource_url": "https://www.casestudy.club/",
                    "estimated_hours": 25,
                    "is_optional": False,
                },
            ],
        },
    ],
    "data-analyst": [
        {
            "phase_number": 1,
            "phase_title": "Phase 1: Analytical Foundations & Spreadsheet Modeling",
            "topics": [
                {
                    "topic_title": "Advanced Spreadsheet Data Analysis",
                    "description": "Pivot tables, XLOOKUP, statistical functions, data cleaning, and scenario modeling.",
                    "key_concepts": ["Pivot tables", "INDEX/MATCH", "Conditional formatting", "Data validation"],
                    "free_resource_name": "Excel / Google Sheets for Beginners to Advanced (freeCodeCamp)",
                    "free_resource_url": "https://www.youtube.com/watch?v=Vl0H-qTclOg",
                    "estimated_hours": 20,
                    "is_optional": False,
                },
                {
                    "topic_title": "Descriptive Statistics & Business Metrics",
                    "description": "Mean, median, standard deviation, percentiles, correlation, and metric definition (CAC, LTV, Churn).",
                    "key_concepts": ["Normal distribution", "Outlier detection", "Hypothesis testing basics"],
                    "free_resource_name": "Khan Academy - Statistics and Probability",
                    "free_resource_url": "https://www.khanacademy.org/math/statistics-probability",
                    "estimated_hours": 20,
                    "is_optional": False,
                },
            ],
        },
        {
            "phase_number": 2,
            "phase_title": "Phase 2: Relational SQL & Exploratory Python",
            "topics": [
                {
                    "topic_title": "SQL Queries, Aggregations & Window Functions",
                    "description": "Complex multi-table joins, subqueries, GROUP BY, HAVING, and analytic window functions.",
                    "key_concepts": ["INNER/LEFT JOIN", "PARTITION BY", "ROW_NUMBER", "CTEs"],
                    "free_resource_name": "Mode Analytics SQL Tutorial (Free)",
                    "free_resource_url": "https://mode.com/sql-tutorial/",
                    "estimated_hours": 30,
                    "is_optional": False,
                },
                {
                    "topic_title": "Python for Data Analysis (Pandas & NumPy)",
                    "description": "DataFrame manipulation, missing value imputation, group-by operations, and string cleaning.",
                    "key_concepts": ["DataFrame indexing", "Vectorized operations", "apply/map functions"],
                    "free_resource_name": "Python Data Science Handbook (Free Online Edition)",
                    "free_resource_url": "https://jakevdp.github.io/PythonDataScienceHandbook/",
                    "estimated_hours": 35,
                    "is_optional": False,
                },
            ],
        },
        {
            "phase_number": 3,
            "phase_title": "Phase 3: Business Intelligence & Data Storytelling",
            "topics": [
                {
                    "topic_title": "Data Visualization & Dashboard Design (Power BI / Tableau)",
                    "description": "Interactive chart selection, dashboard hierarchy, drill-downs, and DAX calculations.",
                    "key_concepts": ["Chart suitability", "Color psychology in charts", "KPI scorecarding"],
                    "free_resource_name": "Microsoft Power BI Official Learning Path (Free MS Learn)",
                    "free_resource_url": "https://learn.microsoft.com/en-us/power-bi/",
                    "estimated_hours": 25,
                    "is_optional": False,
                },
                {
                    "topic_title": "Executive Presentation & Data Storytelling",
                    "description": "Translating data insights into actionable business recommendations for stakeholders.",
                    "key_concepts": ["Insight vs Observation", "Executive summaries", "A/B testing readouts"],
                    "free_resource_name": "Storytelling with Data (Public Podcast & Blog)",
                    "free_resource_url": "https://www.storytellingwithdata.com/blog",
                    "estimated_hours": 15,
                    "is_optional": False,
                },
            ],
        },
    ],
}

# Generic fallback builder for any career without a custom specialized syllabus
def generate_generic_syllabus(career_title: str, cluster: str) -> list[dict]:
    return [
        {
            "phase_number": 1,
            "phase_title": "Phase 1: Academic & Disciplinary Foundations",
            "topics": [
                {
                    "topic_title": f"Core Principles of {career_title}",
                    "description": f"Foundational concepts, industry terminology, and regulatory standards governing {cluster}.",
                    "key_concepts": ["Domain terminology", "Regulatory compliance", "Ethical standards"],
                    "free_resource_name": "SWAYAM / NPTEL National Portal",
                    "free_resource_url": "https://swayam.gov.in/",
                    "estimated_hours": 20,
                    "is_optional": False,
                },
                {
                    "topic_title": "Essential Tooling & Environment Setup",
                    "description": f"Standard software, calculation methods, and documentation tools used by professional {career_title}s.",
                    "key_concepts": ["Standard operating procedures", "Documentation standards", "Digital tools"],
                    "free_resource_name": "National Digital Library of India (NDLI)",
                    "free_resource_url": "https://ndl.iitkgp.ac.in/",
                    "estimated_hours": 15,
                    "is_optional": False,
                },
            ],
        },
        {
            "phase_number": 2,
            "phase_title": "Phase 2: Applied Practice & Problem Solving",
            "topics": [
                {
                    "topic_title": f"Practical Execution & Case Analysis in {cluster}",
                    "description": f"Executing standard workflows, identifying common failures, and analyzing real-world cases.",
                    "key_concepts": ["Case study analysis", "Quality assurance", "Risk mitigation"],
                    "free_resource_name": "Open Educational Resources (OER) India",
                    "free_resource_url": "https://www.sakshat.ac.in/",
                    "estimated_hours": 30,
                    "is_optional": False,
                },
                {
                    "topic_title": "Professional Communication & Stakeholder Management",
                    "description": "Client reporting, cross-functional collaboration, and technical documentation.",
                    "key_concepts": ["Technical writing", "Stakeholder presentations", "Project tracking"],
                    "free_resource_name": "Coursera Public/Audited Courses",
                    "free_resource_url": "https://www.coursera.org/",
                    "estimated_hours": 15,
                    "is_optional": False,
                },
            ],
        },
        {
            "phase_number": 3,
            "phase_title": "Phase 3: Real-World Portfolio & Licensure Preparation",
            "topics": [
                {
                    "topic_title": "Regulatory Compliance, Licensure & Industry Standards",
                    "description": "Preparation for entrance tests, licensure examinations, and professional code of ethics.",
                    "key_concepts": ["Indian regulatory frameworks", "Professional licensing", "Continuing education"],
                    "free_resource_name": "AICTE / Regulatory Board Official Portal",
                    "free_resource_url": "https://www.aicte-india.org/",
                    "estimated_hours": 25,
                    "is_optional": False,
                },
            ],
        },
    ]


PROJECT_DATA: dict[str, list[dict]] = {
    "software-developer": [
        {
            "id": "sw-task-tracker-cli",
            "difficulty": "beginner",
            "title": "Task Tracker Command Line Tool (CLI)",
            "tag": "CLI",
            "summary": "Build a command-line interface application to track tasks, deadlines, and completion states stored in a local JSON file.",
            "requirements": [
                "Support adding, updating, and deleting tasks via positional CLI arguments",
                "Store tasks in a local `tasks.json` file created automatically if missing",
                "Filter and list tasks by status: all, done, in-progress, todo",
                "Record timestamps (`createdAt`, `updatedAt`) for every task item",
            ],
            "skills_exercised": ["File System I/O", "JSON Parsing", "CLI Argument Parsing", "Error Handling"],
            "constraints": ["Use standard library only (no external database packages)", "Graceful error messages on invalid input"],
            "example_input_output": "Usage: `task-cli add 'Finish Next_Path roadmap'` -> Output: `Task 1 added successfully.`",
        },
        {
            "id": "sw-student-notes-api",
            "difficulty": "intermediate",
            "title": "Student Notes Sharing REST API with JWT",
            "tag": "REST API",
            "summary": "Develop a secure RESTful API allowing students to upload, categorize, search, and share revision notes across educational stages.",
            "requirements": [
                "User registration and login endpoints with password hashing and JWT token issuance",
                "CRUD operations for notes with subject tags, stage filters, and visibility toggles",
                "Pagination and full-text keyword search across note titles and content",
                "Role-based access control ensuring students can only edit or delete their own notes",
            ],
            "skills_exercised": ["FastAPI / Express", "Relational Database ORM", "JWT Authentication", "Data Validation"],
            "constraints": ["Enforce input validation with Pydantic / Zod", "Return standardized RFC 7807 JSON error responses"],
            "example_input_output": "POST /api/v1/notes { title, subject, content } -> HTTP 201 Created with JSON note object",
        },
        {
            "id": "sw-portfolio-scholarship-matcher",
            "difficulty": "advanced",
            "title": "Distributed Real-Time Job & Scholarship Matcher with Caching",
            "tag": "Full Stack",
            "summary": "Architect an end-to-end full-stack application that scrapes or ingests scholarship and career data, applies matching scoring, and notifies users with cached responses.",
            "requirements": [
                "Implement asynchronous background worker jobs for periodic data verification",
                "Redis or in-memory caching layer with TTL expiration for high-traffic endpoints",
                "Responsive React/Tailwind frontend dashboard with search filters and PDF export",
                "Docker Compose setup orchestrating API, Database, and Web Frontend containers",
            ],
            "skills_exercised": ["Microservices / Docker", "Caching Strategies", "Background Tasks", "Full-Stack System Design"],
            "constraints": ["Sub-200ms cached response time", "Zero data loss on container restarts"],
            "example_input_output": "Docker Compose file + React Web App + FastAPI Backend running together.",
        },
    ],
    "ux-designer": [
        {
            "id": "ux-college-portal-redesign",
            "difficulty": "beginner",
            "title": "College Admissions Portal Mobile UX Redesign",
            "tag": "Case Study",
            "summary": "Evaluate and redesign a clunky state or university admissions portal for high-stress, mobile-first student applicant usability.",
            "requirements": [
                "Conduct a 10-heuristic usability audit of an existing admissions website",
                "Create 3 user personas representing diverse applicants (rural, low bandwidth, English-second-language)",
                "Design low-fidelity sketches and interactive Figma wireframes for the core application flow",
            ],
            "skills_exercised": ["Heuristic Audit", "Persona Creation", "Wireframing", "Figma"],
            "constraints": ["WCAG AA 4.5:1 minimum color contrast", "44px minimum tap target sizes"],
            "example_input_output": "Deliverable: 5-screen interactive Figma prototype link + 2-page PDF heuristic audit.",
        },
        {
            "id": "ux-fintech-micro-savings-app",
            "difficulty": "intermediate",
            "title": "Gamified Micro-Savings & Scholarship App for Students",
            "tag": "Mobile App UI",
            "summary": "Design an intuitive, transparent mobile application that helps vocational and college students budget fees, track micro-savings, and discover state scholarships.",
            "requirements": [
                "Complete Information Architecture (sitemap and user task journeys)",
                "Component design system with accessible typography, color tokens, and button variants in Figma",
                "High-fidelity interactive prototype with realistic micro-animations and validation states",
            ],
            "skills_exercised": ["Design Systems", "Auto-Layout", "Micro-Interactions", "Information Architecture"],
            "constraints": ["No dark patterns (transparent fee breakdowns)", "Dual language toggle (English/Hindi)"],
            "example_input_output": "Deliverable: Figma Design System file + interactive prototype walkthrough video.",
        },
        {
            "id": "ux-enterprise-design-system-audit",
            "difficulty": "advanced",
            "title": "End-to-End Design System & User-Tested Usability Study",
            "tag": "Design System",
            "summary": "Author a scalable design system for educational platforms and run unmoderated usability tests with at least 5 real users.",
            "requirements": [
                "Complete tokenized design system (Typography, Spacing, Surface elevation, Accessible color palettes)",
                "Comprehensive component library (Modals, Forms, Data tables, Navigation, Empty states)",
                "Documented usability test report with System Usability Scale (SUS) scores and iterative redesigns",
            ],
            "skills_exercised": ["Design System Governance", "Usability Testing", "SUS Scoring", "Figma Variables"],
            "constraints": ["Zero raw hex values (strictly tokenized)", "Complete test findings synthesis deck"],
            "example_input_output": "Deliverable: Published Figma Community Design System + Case Study Portfolio article.",
        },
    ],
    "data-analyst": [
        {
            "id": "da-railway-census-eda",
            "difficulty": "beginner",
            "title": "Exploratory Data Analysis on Public Indian Datasets",
            "tag": "EDA & Python",
            "summary": "Perform in-depth exploratory data analysis on a real public dataset (e.g. Indian Railway delays or Census education demographics) using Pandas and Seaborn.",
            "requirements": [
                "Clean data: handle missing values, correct data types, and identify statistical outliers",
                "Compute key summary statistics (mean, median, standard deviations, distributions)",
                "Generate at least 6 insightful visualizations answering specific domain questions",
            ],
            "skills_exercised": ["Pandas", "Matplotlib / Seaborn", "Data Cleaning", "Jupyter Notebook"],
            "constraints": ["Fully reproducible Jupyter Notebook with written narrative insights", "Dataset >= 5,000 rows"],
            "example_input_output": "Jupyter Notebook on GitHub with clear markdown commentary and visualizations.",
        },
        {
            "id": "da-scholarship-bi-dashboard",
            "difficulty": "intermediate",
            "title": "Interactive State Scholarship Opportunity Dashboard",
            "tag": "Power BI / Tableau",
            "summary": "Build an executive-ready business intelligence dashboard analyzing scholarship distribution across Indian states, income tiers, and demographic categories.",
            "requirements": [
                "Design a clean dimensional data model (Fact and Dimension tables)",
                "Create DAX / calculated measures for scholarship coverage, average aid amount, and state penetration",
                "Implement interactive slicers, drill-through paths, and KPI scorecard banners",
            ],
            "skills_exercised": ["Power BI / Tableau", "Data Modeling", "DAX Calculations", "Dashboard UX"],
            "constraints": ["Follow high-contrast visual design hierarchy", "Include an 'About Data' disclaimer tile"],
            "example_input_output": "Public Power BI link or Tableau Public workbook + PDF executive summary.",
        },
        {
            "id": "da-labor-market-pipeline",
            "difficulty": "advanced",
            "title": "Automated Labor Market Insights ETL & Forecasting Pipeline",
            "tag": "SQL & ETL",
            "summary": "Build an automated ETL pipeline that ingests job posting datasets into PostgreSQL, transforms skill matrices with SQL window functions, and forecasts hiring trends.",
            "requirements": [
                "Write automated Python extraction script loading raw data into normalized PostgreSQL tables",
                "Author complex SQL transformation queries utilizing window functions, CTEs, and aggregations",
                "Deploy an interactive Streamlit or Dash web app visualizing salary percentiles by skill",
            ],
            "skills_exercised": ["PostgreSQL", "Window Functions", "Streamlit", "Automated ETL Pipelines"],
            "constraints": ["Automated idempotent seed script", "Live interactive web interface"],
            "example_input_output": "Live Streamlit Web Application + GitHub Repo with SQL schema migrations.",
        },
    ],
}

def generate_generic_projects(career_id: str, career_title: str, cluster: str) -> list[dict]:
    return [
        {
            "id": f"{career_id}-starter-case",
            "difficulty": "beginner",
            "title": f"Foundational {career_title} Practice Case & Analysis",
            "tag": "Case Study",
            "summary": f"Complete a structured baseline case study applying the core principles and documentation standards of {career_title}.",
            "requirements": [
                f"Identify the primary problem statement and regulatory constraints in a sample {career_title} scenario",
                "Execute the initial assessment calculation or structured diagnostic report",
                "Produce a clean, professional summary report with actionable recommendations",
            ],
            "skills_exercised": ["Foundational Diagnostics", "Domain Analysis", "Report Writing"],
            "constraints": ["Follow official Indian industry guidelines", "Include reference citations"],
            "example_input_output": "Deliverable: 3-page structured PDF case analysis with executive summary.",
        },
        {
            "id": f"{career_id}-applied-project",
            "difficulty": "intermediate",
            "title": f"Applied {career_title} Solution Framework & Model",
            "tag": "Applied Project",
            "summary": f"Design and execute a realistic multi-step project demonstrating intermediate competencies in {cluster}.",
            "requirements": [
                "Develop a comprehensive project plan, budget estimation, or workflow blueprint",
                "Account for risk factors, local compliance, and cost considerations",
                "Present findings with visual diagrams, spreadsheets, or technical documentation",
            ],
            "skills_exercised": ["Project Planning", "Risk Assessment", "Cost Estimation", "Domain Tooling"],
            "constraints": ["Budget and resource limits must match realistic Indian market benchmarks"],
            "example_input_output": "Deliverable: Complete project dossier with calculations and technical blueprints.",
        },
        {
            "id": f"{career_id}-capstone-portfolio",
            "difficulty": "advanced",
            "title": f"{career_title} Comprehensive Capstone & Portfolio Presentation",
            "tag": "Portfolio Capstone",
            "summary": f"An end-to-end real-world capstone project demonstrating production readiness, ethical considerations, and cross-functional leadership.",
            "requirements": [
                "Complete full lifecycle execution from initial requirement gathering to final delivery",
                "Incorporate quality audit, safety standards, and stakeholder presentation",
                "Publish a public portfolio presentation detailing methodology, hurdles overcome, and results",
            ],
            "skills_exercised": ["End-to-End Execution", "Quality Auditing", "Stakeholder Presentation", "Leadership"],
            "constraints": ["Production-grade quality suitable for employer or licensing review"],
            "example_input_output": "Deliverable: Public repository, portfolio deck, or verified project submission.",
        },
    ]


TRAJECTORY_DATA: dict[str, list[dict]] = {
    "software-developer": [
        {
            "target_career_title": "Senior Software Engineer / Tech Lead",
            "trajectory_type": "vertical_advancement",
            "typical_years_experience": "3-5 years",
            "expected_salary_delta_inr": "+₹8,00,000 - ₹18,00,000 / annum",
            "required_delta_skills": ["System Architecture Design", "Code Review Leadership", "Distributed Systems", "Sprint Mentorship"],
            "transferable_skills_pct": 90,
            "overview": "Transitions from individual task coding to system architecture, performance optimization, and technical team mentorship.",
        },
        {
            "target_career_title": "Engineering Manager / Product Manager",
            "trajectory_type": "lateral_transition",
            "typical_years_experience": "4-7 years",
            "expected_salary_delta_inr": "+₹10,00,000 - ₹22,00,000 / annum",
            "required_delta_skills": ["People Management", "Product Roadmapping", "Business KPI Alignment", "Budgeting"],
            "transferable_skills_pct": 70,
            "overview": "Pivots technical foundation into team leadership, product strategy, hiring, and business stakeholder delivery.",
        },
        {
            "target_career_title": "Cloud Architect / DevOps Lead",
            "trajectory_type": "specialization",
            "typical_years_experience": "3-6 years",
            "expected_salary_delta_inr": "+₹9,00,000 - ₹20,00,000 / annum",
            "required_delta_skills": ["Kubernetes Clustering", "Infrastructure as Code (Terraform)", "Cloud Security", "Cost Optimization"],
            "transferable_skills_pct": 80,
            "overview": "Specializes in enterprise cloud reliability, infrastructure automation, zero-downtime deployments, and platform engineering.",
        },
    ],
    "ux-designer": [
        {
            "target_career_title": "Lead Product Designer / Design Manager",
            "trajectory_type": "vertical_advancement",
            "typical_years_experience": "3-5 years",
            "expected_salary_delta_inr": "+₹6,00,000 - ₹14,00,000 / annum",
            "required_delta_skills": ["Design System Governance", "Executive Stakeholder Negotiation", "UX Research Operations"],
            "transferable_skills_pct": 85,
            "overview": "Leads organizational design strategy, establishes multi-product design systems, and coaches junior designers.",
        },
        {
            "target_career_title": "Product Manager (Tech/Product)",
            "trajectory_type": "lateral_transition",
            "typical_years_experience": "2-5 years",
            "expected_salary_delta_inr": "+₹5,00,000 - ₹12,00,000 / annum",
            "required_delta_skills": ["Unit Economics & Pricing", "Agile Backlog Grooming", "SQL Analytics", "Market Sizing"],
            "transferable_skills_pct": 65,
            "overview": "Combines deep customer empathy and UX prototyping speed with full business ownership and engineering coordination.",
        },
    ],
    "data-analyst": [
        {
            "target_career_title": "Senior BI Analyst / Analytics Manager",
            "trajectory_type": "vertical_advancement",
            "typical_years_experience": "3-5 years",
            "expected_salary_delta_inr": "+₹5,00,000 - ₹12,00,000 / annum",
            "required_delta_skills": ["Executive Storytelling", "Advanced Data Warehousing", "Semantic Layer Design"],
            "transferable_skills_pct": 85,
            "overview": "Directs business intelligence strategy, manages analytics team queues, and advises C-suite on operational metrics.",
        },
        {
            "target_career_title": "Data Scientist (Machine Learning)",
            "trajectory_type": "lateral_transition",
            "typical_years_experience": "2-4 years",
            "expected_salary_delta_inr": "+₹6,00,000 - ₹15,00,000 / annum",
            "required_delta_skills": ["Machine Learning Algorithms", "Predictive Modeling (scikit-learn)", "Calculus & Linear Algebra"],
            "transferable_skills_pct": 75,
            "overview": "Expands retrospective diagnostic analytics into forward-looking predictive modeling, recommendation engines, and ML systems.",
        },
        {
            "target_career_title": "Data Engineer (Big Data & Pipelines)",
            "trajectory_type": "specialization",
            "typical_years_experience": "2-4 years",
            "expected_salary_delta_inr": "+₹7,00,000 - ₹16,00,000 / annum",
            "required_delta_skills": ["Apache Spark / PySpark", "Airflow Orchestration", "Distributed Storage", "Data Lakehouse Design"],
            "transferable_skills_pct": 70,
            "overview": "Specializes in building robust, scalable data ingestion pipelines and real-time streaming architectures.",
        },
    ],
}

def generate_generic_trajectories(career_id: str, career_title: str, cluster: str) -> list[dict]:
    return [
        {
            "target_career_title": f"Senior {career_title} / Specialist Lead",
            "trajectory_type": "vertical_advancement",
            "typical_years_experience": "3-5 years",
            "expected_salary_delta_inr": "+₹4,00,000 - ₹10,00,000 / annum",
            "required_delta_skills": ["Advanced Case Leadership", "Quality Assurance Management", "Team Mentorship"],
            "transferable_skills_pct": 85,
            "overview": f"Advances to senior execution, managing high-complexity projects and guiding junior professionals in {cluster}.",
        },
        {
            "target_career_title": f"{cluster} Operations Manager / Consultant",
            "trajectory_type": "lateral_transition",
            "typical_years_experience": "4-6 years",
            "expected_salary_delta_inr": "+₹5,00,000 - ₹12,00,000 / annum",
            "required_delta_skills": ["Budget & P&L Oversight", "Strategic Planning", "Client Relationship Management"],
            "transferable_skills_pct": 70,
            "overview": f"Transitions domain expertise into strategic management, independent consulting, or operational department oversight.",
        },
    ]


async def seed_syllabi_and_projects(session: AsyncSession) -> tuple[int, int, int]:
    """Populates syllabi, projects, and trajectories for all careers."""
    # 1. Fetch all careers in the database
    result = await session.execute(select(CareerLibrary))
    careers = list(result.scalars().all())
    if not careers:
        logger.warning("No careers found in database. Seed careers first.")
        return (0, 0, 0)

    # 2. Clear existing rows to ensure clean idempotency
    await session.execute(delete(CareerTopicSyllabus))
    await session.execute(delete(SkillProjectIdea))
    await session.execute(delete(CareerTrajectory))

    syllabi_count = 0
    projects_count = 0
    trajectories_count = 0

    for career in careers:
        c_id = career.id
        c_title = career.title
        c_cluster = career.cluster

        # --- A. Seed Syllabi ---
        phases = SYLLABUS_DATA.get(c_id) or generate_generic_syllabus(c_title, c_cluster)
        for phase in phases:
            p_num = phase["phase_number"]
            p_title = phase["phase_title"]
            for topic in phase["topics"]:
                syllabus_item = CareerTopicSyllabus(
                    career_id=c_id,
                    phase_number=p_num,
                    phase_title=p_title,
                    topic_title=topic["topic_title"],
                    description=topic["description"],
                    key_concepts=topic.get("key_concepts", []),
                    free_resource_name=topic["free_resource_name"],
                    free_resource_url=topic["free_resource_url"],
                    estimated_hours=topic.get("estimated_hours", 10),
                    is_optional=topic.get("is_optional", False),
                )
                session.add(syllabus_item)
                syllabi_count += 1

        # --- B. Seed Projects ---
        projects = PROJECT_DATA.get(c_id) or generate_generic_projects(c_id, c_title, c_cluster)
        for proj in projects:
            project_item = SkillProjectIdea(
                id=proj["id"],
                career_id=c_id,
                difficulty=proj["difficulty"],
                title=proj["title"],
                tag=proj["tag"],
                summary=proj["summary"],
                requirements=proj.get("requirements", []),
                skills_exercised=proj.get("skills_exercised", []),
                constraints=proj.get("constraints", []),
                example_input_output=proj.get("example_input_output"),
            )
            session.add(project_item)
            projects_count += 1

        # --- C. Seed Trajectories ---
        trajectories = TRAJECTORY_DATA.get(c_id) or generate_generic_trajectories(c_id, c_title, c_cluster)
        for traj in trajectories:
            trajectory_item = CareerTrajectory(
                source_career_id=c_id,
                target_career_title=traj["target_career_title"],
                trajectory_type=traj["trajectory_type"],
                typical_years_experience=traj["typical_years_experience"],
                expected_salary_delta_inr=traj["expected_salary_delta_inr"],
                required_delta_skills=traj.get("required_delta_skills", []),
                transferable_skills_pct=traj["transferable_skills_pct"],
                overview=traj["overview"],
            )
            session.add(trajectory_item)
            trajectories_count += 1

    await session.commit()
    logger.info(
        "Seeded %d syllabus topics, %d project ideas, and %d trajectories across %d careers.",
        syllabi_count,
        projects_count,
        trajectories_count,
        len(careers),
    )
    return (syllabi_count, projects_count, trajectories_count)
