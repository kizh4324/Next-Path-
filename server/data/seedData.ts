import fs from 'fs';
import path from 'path';

export interface CareerSkill {
  id: number;
  skill_name: string;
  category: 'essential' | 'useful' | 'optional';
  normalized_importance: number;
}

export interface IndiaEntryRoute {
  route_name: string;
  duration_years: number;
  entrance_exams: string[];
  cost_tier: 'low_cost_only' | 'moderate_up_to_2_lakhs' | 'flexible_above_2_lakhs';
  estimated_cost_inr_min: number;
  estimated_cost_inr_max: number;
  degree_or_cert_awarded: string;
  low_cost_alternative_route: string | null;
  availability_scope: 'home_district_only' | 'within_state' | 'anywhere_in_india' | 'abroad';
}

export interface Career {
  id: string;
  onet_soc_code: string;
  title: string;
  cluster: string;
  description: string;
  job_zone: number;
  riasec_code: string;
  riasec_scores: Record<string, number>;
  work_reality_summary: string;
  applicable_stages: string[];
  india_entry_routes: IndiaEntryRoute[];
  prerequisites: string;
  risks_and_tradeoffs: string[];
  regional_caveats: string[];
  source_links: string[];
  skills: CareerSkill[];
}

export interface MarketSnapshot {
  career_id: string;
  geography: string;
  timeframe_period: string;
  data_source: string;
  demand_indicator: 'High' | 'Moderate' | 'Emerging' | 'Stable' | 'Niche';
  salary_range_entry_inr: string | null;
  salary_range_mid_inr: string | null;
  top_demanded_skills: { skill: string; postings: number; share_pct: number }[];
}

export interface Scholarship {
  id: number;
  name: string;
  state: string;
  sponsor_type: 'Government' | 'Private' | 'Institutional';
  target_category: string;
  income_ceiling_inr: number;
  min_qualification: string;
  amount_description: string;
  eligibility_summary: string;
  deadline_description: string;
  required_documents: string[];
  official_source_url: string;
  last_verified_date: string;
  renewal_conditions: string | null;
  is_active: boolean;
  source_description: string;
}

export interface SyllabusTopic {
  topic_title: string;
  description: string;
  key_concepts: string[];
  free_resource_name: string;
  free_resource_url: string;
  estimated_hours: number;
  is_optional: boolean;
}

export interface SyllabusPhase {
  phase_number: number;
  phase_title: string;
  topics: SyllabusTopic[];
}

export interface SkillProject {
  id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  title: string;
  tag: string;
  summary: string;
  requirements: string[];
  skills_exercised: string[];
  constraints: string[];
  example_input_output: string;
}

export interface CareerTrajectoryItem {
  target_career_title: string;
  trajectory_type: 'vertical_advancement' | 'lateral_transition' | 'specialization';
  typical_years_experience: string;
  expected_salary_delta_inr: string;
  required_delta_skills: string[];
  transferable_skills_pct: number;
  overview: string;
}

// Load seed data from json files
let cachedCareers: Career[] = [];
let cachedSnapshots: Record<string, MarketSnapshot> = {};
let cachedScholarships: Scholarship[] = [];

export function loadSeedData() {
  try {
    const careerClustersPath = path.resolve(process.cwd(), 'data/seed/seed_career_clusters.json');
    if (fs.existsSync(careerClustersPath)) {
      const data = JSON.parse(fs.readFileSync(careerClustersPath, 'utf-8'));
      cachedCareers = (data.careers || []).map((c: any) => ({
        ...c,
        skills: (c.skills || []).map((s: any, sIdx: number) => ({
          id: sIdx + 1,
          skill_name: s.skill_name,
          category: s.category,
          normalized_importance: s.normalized_importance,
        })),
      }));
    }
  } catch (err) {
    console.error('Error loading career clusters seed:', err);
  }

  try {
    const snapshotsPath = path.resolve(process.cwd(), 'data/seed/seed_market_snapshots.json');
    if (fs.existsSync(snapshotsPath)) {
      const data = JSON.parse(fs.readFileSync(snapshotsPath, 'utf-8'));
      for (const s of data.snapshots || []) {
        cachedSnapshots[s.career_id] = s;
      }
    }
  } catch (err) {
    console.error('Error loading market snapshots seed:', err);
  }

  try {
    const scholarshipsPath = path.resolve(process.cwd(), 'data/seed/seed_scholarships.json');
    if (fs.existsSync(scholarshipsPath)) {
      const data = JSON.parse(fs.readFileSync(scholarshipsPath, 'utf-8'));
      cachedScholarships = data.scholarships || [];
    }
  } catch (err) {
    console.error('Error loading scholarships seed:', err);
  }
}

// Call on startup
loadSeedData();

export function getCareers(): Career[] {
  return cachedCareers;
}

export function getCareerById(id: string): Career | undefined {
  return cachedCareers.find((c) => c.id === id);
}

export function getMarketSnapshot(careerId: string): MarketSnapshot | null {
  return cachedSnapshots[careerId] ?? null;
}

export function getScholarships(): Scholarship[] {
  return cachedScholarships;
}

// Custom Syllabi
const CUSTOM_SYLLABI: Record<string, SyllabusPhase[]> = {
  'software-developer': [
    {
      phase_number: 1,
      phase_title: 'Phase 1: Programming & Problem Solving Foundations',
      topics: [
        {
          topic_title: 'Computational Thinking & Control Structures',
          description: 'Variables, conditionals, loops, functions, and memory mental models.',
          key_concepts: ['Logic gates', 'Flow control', 'Recursion', 'Big-O notation'],
          free_resource_name: 'CS50: Introduction to Computer Science (Harvard/edX)',
          free_resource_url: 'https://cs50.harvard.edu/x/',
          estimated_hours: 20,
          is_optional: false,
        },
        {
          topic_title: 'Data Structures & Basic Algorithms',
          description: 'Arrays, Linked Lists, Stacks, Queues, Hash Tables, and Sorting algorithms.',
          key_concepts: ['Hash Maps', 'Binary Search', 'Time/Space Complexity'],
          free_resource_name: 'NPTEL - Programming, Data Structures and Algorithms in Python',
          free_resource_url: 'https://nptel.ac.in/courses/106106145',
          estimated_hours: 30,
          is_optional: false,
        },
        {
          topic_title: 'Version Control & Collaborative Git',
          description: 'Git branching, pull requests, merge conflict resolution, and GitHub workflows.',
          key_concepts: ['Commit hygiene', 'Rebase vs Merge', 'SSH keys', 'PR Reviews'],
          free_resource_name: 'Pro Git Book (Free E-Book)',
          free_resource_url: 'https://git-scm.com/book/en/v2',
          estimated_hours: 10,
          is_optional: false,
        },
      ],
    },
    {
      phase_number: 2,
      phase_title: 'Phase 2: Full-Stack & API Engineering',
      topics: [
        {
          topic_title: 'Relational Databases & SQL Modeling',
          description: 'Schema design, normalization, ACID transactions, indexing, and joins.',
          key_concepts: ['Foreign keys', 'Indexing', 'Query optimization', 'Connection pooling'],
          free_resource_name: 'PostgreSQL Official Tutorial',
          free_resource_url: 'https://www.postgresql.org/docs/current/tutorial.html',
          estimated_hours: 25,
          is_optional: false,
        },
        {
          topic_title: 'Backend Architecture & RESTful APIs',
          description: 'HTTP protocol, status codes, authentication (JWT/OAuth), and asynchronous runtimes.',
          key_concepts: ['Statelessness', 'Middleware', 'CORS', 'Rate limiting'],
          free_resource_name: 'FastAPI / Node.js Official Documentation',
          free_resource_url: 'https://fastapi.tiangolo.com/tutorial/',
          estimated_hours: 30,
          is_optional: false,
        },
        {
          topic_title: 'Frontend Component Architecture',
          description: 'DOM manipulation, reactive state, props, hooks, and responsive design systems.',
          key_concepts: ['Component hierarchy', 'State lifting', 'Tailwind CSS', 'Accessibility'],
          free_resource_name: 'freeCodeCamp Full-Stack Developer Certification',
          free_resource_url: 'https://www.freecodecamp.org/learn',
          estimated_hours: 35,
          is_optional: false,
        },
      ],
    },
    {
      phase_number: 3,
      phase_title: 'Phase 3: Production, Testing & Cloud Deployment',
      topics: [
        {
          topic_title: 'Automated Testing & Test-Driven Development',
          description: 'Unit testing, integration testing, mocking, and end-to-end assertions.',
          key_concepts: ['Pytest / Vitest', 'Mocks & Stubs', 'Coverage reports', 'CI pipelines'],
          free_resource_name: 'Python Testing with pytest / Vitest Guides',
          free_resource_url: 'https://docs.pytest.org/',
          estimated_hours: 15,
          is_optional: false,
        },
        {
          topic_title: 'Containerization & CI/CD',
          description: 'Docker images, multi-stage builds, compose files, and GitHub Actions automation.',
          key_concepts: ['Dockerfile optimization', 'Volumes', 'Environment secrets', 'Docker Compose'],
          free_resource_name: 'Docker Getting Started Guide',
          free_resource_url: 'https://docs.docker.com/get-started/',
          estimated_hours: 20,
          is_optional: false,
        },
      ],
    },
  ],
  'ux-designer': [
    {
      phase_number: 1,
      phase_title: 'Phase 1: Foundations of User Research & Heuristics',
      topics: [
        {
          topic_title: 'User Research Methodologies & Empathy',
          description: 'Conducting qualitative interviews, creating user personas, and empathy maps.',
          key_concepts: ['Contextual inquiry', 'Mental models', 'Affinity mapping'],
          free_resource_name: 'NPTEL - Interaction Design by IIT Guwahati',
          free_resource_url: 'https://nptel.ac.in/courses/106103115',
          estimated_hours: 20,
          is_optional: false,
        },
        {
          topic_title: 'Usability Heuristics & Interface Laws',
          description: 'Nielsen Norman 10 Usability Heuristics, Fitts Law, Hick Law, and Gestalt Principles.',
          key_concepts: ['Heuristic evaluation', 'Error prevention', 'Recognition over recall'],
          free_resource_name: 'Nielsen Norman Group Articles (Free Library)',
          free_resource_url: 'https://www.nngroup.com/articles/ten-usability-heuristics/',
          estimated_hours: 15,
          is_optional: false,
        },
      ],
    },
    {
      phase_number: 2,
      phase_title: 'Phase 2: Information Architecture & Wireframing',
      topics: [
        {
          topic_title: 'User Flows & Information Architecture',
          description: 'Tree testing, card sorting, task flows, and sitemap navigation structuring.',
          key_concepts: ['Card sorting', 'Navigation taxonomy', 'Happy vs edge-case flows'],
          free_resource_name: 'Interaction Design Foundation Free Articles',
          free_resource_url: 'https://www.interaction-design.org/literature/topics/information-architecture',
          estimated_hours: 20,
          is_optional: false,
        },
        {
          topic_title: 'Figma Mastery: Components, Grids & Auto-Layout',
          description: 'Building responsive UI components, constraints, auto-layout, and design tokens.',
          key_concepts: ['8pt grid', 'Design tokens', 'Variants', 'Interactive components'],
          free_resource_name: 'Figma Official Community Tutorials',
          free_resource_url: 'https://help.figma.com/hc/en-us/categories/360002042553',
          estimated_hours: 30,
          is_optional: false,
        },
      ],
    },
    {
      phase_number: 3,
      phase_title: 'Phase 3: Design Systems, Testing & Portfolio Case Studies',
      topics: [
        {
          topic_title: 'Accessible Design (WCAG AA Compliance)',
          description: 'Color contrast ratios, screen reader semantics, focus states, and scalable typography.',
          key_concepts: ['WCAG 2.1 AA', 'Color blindness simulation', 'Keyboard navigation'],
          free_resource_name: 'W3C Web Accessibility Initiative (WAI)',
          free_resource_url: 'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
          estimated_hours: 15,
          is_optional: false,
        },
        {
          topic_title: 'Usability Testing & Case Study Storytelling',
          description: 'Drafting test scripts, SUS scoring, synthesizing insights, and publishing portfolio decks.',
          key_concepts: ['Task completion rate', 'SUS metric', 'Problem-Impact-Solution framing'],
          free_resource_name: 'Case Study Club Guides',
          free_resource_url: 'https://www.casestudy.club/',
          estimated_hours: 25,
          is_optional: false,
        },
      ],
    },
  ],
  'data-analyst': [
    {
      phase_number: 1,
      phase_title: 'Phase 1: Analytical Foundations & Spreadsheet Modeling',
      topics: [
        {
          topic_title: 'Advanced Spreadsheet Data Analysis',
          description: 'Pivot tables, XLOOKUP, statistical functions, data cleaning, and scenario modeling.',
          key_concepts: ['Pivot tables', 'INDEX/MATCH', 'Conditional formatting', 'Data validation'],
          free_resource_name: 'Excel / Google Sheets for Beginners to Advanced (freeCodeCamp)',
          free_resource_url: 'https://www.youtube.com/watch?v=Vl0H-qTclOg',
          estimated_hours: 20,
          is_optional: false,
        },
        {
          topic_title: 'Descriptive Statistics & Business Metrics',
          description: 'Mean, median, standard deviation, percentiles, correlation, and metric definition (CAC, LTV, Churn).',
          key_concepts: ['Normal distribution', 'Outlier detection', 'Hypothesis testing basics'],
          free_resource_name: 'Khan Academy - Statistics and Probability',
          free_resource_url: 'https://www.khanacademy.org/math/statistics-probability',
          estimated_hours: 20,
          is_optional: false,
        },
      ],
    },
    {
      phase_number: 2,
      phase_title: 'Phase 2: Relational SQL & Exploratory Python',
      topics: [
        {
          topic_title: 'SQL Queries, Aggregations & Window Functions',
          description: 'Complex multi-table joins, subqueries, GROUP BY, HAVING, and analytic window functions.',
          key_concepts: ['INNER/LEFT JOIN', 'PARTITION BY', 'ROW_NUMBER', 'CTEs'],
          free_resource_name: 'Mode Analytics SQL Tutorial (Free)',
          free_resource_url: 'https://mode.com/sql-tutorial/',
          estimated_hours: 30,
          is_optional: false,
        },
        {
          topic_title: 'Python for Data Analysis (Pandas & NumPy)',
          description: 'DataFrame manipulation, missing value imputation, group-by operations, and string cleaning.',
          key_concepts: ['DataFrame indexing', 'Vectorized operations', 'apply/map functions'],
          free_resource_name: 'Python Data Science Handbook (Free Online Edition)',
          free_resource_url: 'https://jakevdp.github.io/PythonDataScienceHandbook/',
          estimated_hours: 35,
          is_optional: false,
        },
      ],
    },
    {
      phase_number: 3,
      phase_title: 'Phase 3: Business Intelligence & Data Storytelling',
      topics: [
        {
          topic_title: 'Data Visualization & Dashboard Design (Power BI / Tableau)',
          description: 'Interactive chart selection, dashboard hierarchy, drill-downs, and DAX calculations.',
          key_concepts: ['Chart suitability', 'Color psychology in charts', 'KPI scorecarding'],
          free_resource_name: 'Microsoft Power BI Official Learning Path (Free MS Learn)',
          free_resource_url: 'https://learn.microsoft.com/en-us/power-bi/',
          estimated_hours: 25,
          is_optional: false,
        },
        {
          topic_title: 'Executive Presentation & Data Storytelling',
          description: 'Translating data insights into actionable business recommendations for stakeholders.',
          key_concepts: ['Insight vs Observation', 'Executive summaries', 'A/B testing readouts'],
          free_resource_name: 'Storytelling with Data (Public Podcast & Blog)',
          free_resource_url: 'https://www.storytellingwithdata.com/blog',
          estimated_hours: 15,
          is_optional: false,
        },
      ],
    },
  ],
};

export function getCareerSyllabus(careerId: string, careerTitle: string, cluster: string): SyllabusPhase[] {
  if (CUSTOM_SYLLABI[careerId]) {
    return CUSTOM_SYLLABI[careerId];
  }
  return [
    {
      phase_number: 1,
      phase_title: 'Phase 1: Academic & Disciplinary Foundations',
      topics: [
        {
          topic_title: `Core Principles of ${careerTitle}`,
          description: `Foundational concepts, industry terminology, and regulatory standards governing ${cluster}.`,
          key_concepts: ['Domain terminology', 'Regulatory compliance', 'Ethical standards'],
          free_resource_name: 'SWAYAM / NPTEL National Portal',
          free_resource_url: 'https://swayam.gov.in/',
          estimated_hours: 20,
          is_optional: false,
        },
        {
          topic_title: 'Essential Tooling & Environment Setup',
          description: `Standard software, calculation methods, and documentation tools used by professional ${careerTitle}s.`,
          key_concepts: ['Standard operating procedures', 'Documentation standards', 'Digital tools'],
          free_resource_name: 'National Digital Library of India (NDLI)',
          free_resource_url: 'https://ndl.iitkgp.ac.in/',
          estimated_hours: 15,
          is_optional: false,
        },
      ],
    },
    {
      phase_number: 2,
      phase_title: 'Phase 2: Applied Practice & Problem Solving',
      topics: [
        {
          topic_title: `Practical Execution & Case Analysis in ${cluster}`,
          description: 'Executing standard workflows, identifying common failures, and analyzing real-world cases.',
          key_concepts: ['Case study analysis', 'Quality assurance', 'Risk mitigation'],
          free_resource_name: 'Open Educational Resources (OER) India',
          free_resource_url: 'https://www.sakshat.ac.in/',
          estimated_hours: 30,
          is_optional: false,
        },
        {
          topic_title: 'Professional Communication & Stakeholder Management',
          description: 'Client reporting, cross-functional collaboration, and technical documentation.',
          key_concepts: ['Technical writing', 'Stakeholder presentations', 'Project tracking'],
          free_resource_name: 'Coursera Public/Audited Courses',
          free_resource_url: 'https://www.coursera.org/',
          estimated_hours: 15,
          is_optional: false,
        },
      ],
    },
    {
      phase_number: 3,
      phase_title: 'Phase 3: Real-World Portfolio & Licensure Preparation',
      topics: [
        {
          topic_title: 'Regulatory Compliance, Licensure & Industry Standards',
          description: 'Preparation for entrance tests, licensure examinations, and professional code of ethics.',
          key_concepts: ['Indian regulatory frameworks', 'Professional licensing', 'Continuing education'],
          free_resource_name: 'AICTE / Regulatory Board Official Portal',
          free_resource_url: 'https://www.aicte-india.org/',
          estimated_hours: 25,
          is_optional: false,
        },
      ],
    },
  ];
}

const CUSTOM_PROJECTS: Record<string, SkillProject[]> = {
  'software-developer': [
    {
      id: 'sw-task-tracker-cli',
      difficulty: 'beginner',
      title: 'Task Tracker Command Line Tool (CLI)',
      tag: 'CLI',
      summary: 'Build a command-line interface application to track tasks, deadlines, and completion states stored in a local JSON file.',
      requirements: [
        'Support adding, updating, and deleting tasks via positional CLI arguments',
        'Store tasks in a local `tasks.json` file created automatically if missing',
        'Filter and list tasks by status: all, done, in-progress, todo',
        'Record timestamps (`createdAt`, `updatedAt`) for every task item',
      ],
      skills_exercised: ['File System I/O', 'JSON Parsing', 'CLI Argument Parsing', 'Error Handling'],
      constraints: ['Use standard library only (no external database packages)', 'Graceful error messages on invalid input'],
      example_input_output: "Usage: `task-cli add 'Finish Next_Path roadmap'` -> Output: `Task 1 added successfully.`",
    },
    {
      id: 'sw-student-notes-api',
      difficulty: 'intermediate',
      title: 'Student Notes Sharing REST API with JWT',
      tag: 'REST API',
      summary: 'Develop a secure RESTful API allowing students to upload, categorize, search, and share revision notes across educational stages.',
      requirements: [
        'User registration and login endpoints with password hashing and JWT token issuance',
        'CRUD operations for notes with subject tags, stage filters, and visibility toggles',
        'Pagination and full-text keyword search across note titles and content',
        'Role-based access control ensuring students can only edit or delete their own notes',
      ],
      skills_exercised: ['FastAPI / Express', 'Relational Database ORM', 'JWT Authentication', 'Data Validation'],
      constraints: ['Enforce input validation with Pydantic / Zod', 'Return standardized RFC 7807 JSON error responses'],
      example_input_output: 'POST /api/v1/notes { title, subject, content } -> HTTP 201 Created with JSON note object',
    },
    {
      id: 'sw-portfolio-scholarship-matcher',
      difficulty: 'advanced',
      title: 'Distributed Real-Time Job & Scholarship Matcher with Caching',
      tag: 'Full Stack',
      summary: 'Architect an end-to-end full-stack application that scrapes or ingests scholarship and career data, applies matching scoring, and notifies users with cached responses.',
      requirements: [
        'Implement asynchronous background worker jobs for periodic data verification',
        'Redis or in-memory caching layer with TTL expiration for high-traffic endpoints',
        'Responsive React/Tailwind frontend dashboard with search filters and PDF export',
        'Docker Compose setup orchestrating API, Database, and Web Frontend containers',
      ],
      skills_exercised: ['Microservices / Docker', 'Caching Strategies', 'Background Tasks', 'Full-Stack System Design'],
      constraints: ['Sub-200ms cached response time', 'Zero data loss on container restarts'],
      example_input_output: 'Docker Compose file + React Web App + FastAPI Backend running together.',
    },
  ],
  'ux-designer': [
    {
      id: 'ux-college-portal-redesign',
      difficulty: 'beginner',
      title: 'College Admissions Portal Mobile UX Redesign',
      tag: 'Case Study',
      summary: 'Evaluate and redesign a clunky state or university admissions portal for high-stress, mobile-first student applicant usability.',
      requirements: [
        'Conduct a 10-heuristic usability audit of an existing admissions website',
        'Create 3 user personas representing diverse applicants (rural, low bandwidth, English-second-language)',
        'Design low-fidelity sketches and interactive Figma wireframes for the core application flow',
      ],
      skills_exercised: ['Heuristic Audit', 'Persona Creation', 'Wireframing', 'Figma'],
      constraints: ['WCAG AA 4.5:1 minimum color contrast', '44px minimum tap target sizes'],
      example_input_output: 'Deliverable: 5-screen interactive Figma prototype link + 2-page PDF heuristic audit.',
    },
    {
      id: 'ux-fintech-micro-savings-app',
      difficulty: 'intermediate',
      title: 'Gamified Micro-Savings & Scholarship App for Students',
      tag: 'Mobile App UI',
      summary: 'Design an intuitive, transparent mobile application that helps vocational and college students budget fees, track micro-savings, and discover state scholarships.',
      requirements: [
        'Complete Information Architecture (sitemap and user task journeys)',
        'Component design system with accessible typography, color tokens, and button variants in Figma',
        'High-fidelity interactive prototype with realistic micro-animations and validation states',
      ],
      skills_exercised: ['Design Systems', 'Auto-Layout', 'Micro-Interactions', 'Information Architecture'],
      constraints: ['No dark patterns (transparent fee breakdowns)', 'Dual language toggle (English/Hindi)'],
      example_input_output: 'Deliverable: Figma Design System file + interactive prototype walkthrough video.',
    },
    {
      id: 'ux-enterprise-design-system-audit',
      difficulty: 'advanced',
      title: 'End-to-End Design System & User-Tested Usability Study',
      tag: 'Design System',
      summary: 'Author a scalable design system for educational platforms and run unmoderated usability tests with at least 5 real users.',
      requirements: [
        'Complete tokenized design system (Typography, Spacing, Surface elevation, Accessible color palettes)',
        'Comprehensive component library (Modals, Forms, Data tables, Navigation, Empty states)',
        'Documented usability test report with System Usability Scale (SUS) scores and iterative redesigns',
      ],
      skills_exercised: ['Design System Governance', 'Usability Testing', 'SUS Scoring', 'Figma Variables'],
      constraints: ['Zero raw hex values (strictly tokenized)', 'Complete test findings synthesis deck'],
      example_input_output: 'Deliverable: Published Figma Community Design System + Case Study Portfolio article.',
    },
  ],
  'data-analyst': [
    {
      id: 'da-railway-census-eda',
      difficulty: 'beginner',
      title: 'Exploratory Data Analysis on Public Indian Datasets',
      tag: 'EDA & Python',
      summary: 'Perform in-depth exploratory data analysis on a real public dataset (e.g. Indian Railway delays or Census education demographics) using Pandas and Seaborn.',
      requirements: [
        'Clean data: handle missing values, correct data types, and identify statistical outliers',
        'Compute key summary statistics (mean, median, standard deviations, distributions)',
        'Generate at least 6 insightful visualizations answering specific domain questions',
      ],
      skills_exercised: ['Pandas', 'Matplotlib / Seaborn', 'Data Cleaning', 'Jupyter Notebook'],
      constraints: ['Fully reproducible Jupyter Notebook with written narrative insights', 'Dataset >= 5,000 rows'],
      example_input_output: 'Jupyter Notebook on GitHub with clear markdown commentary and visualizations.',
    },
    {
      id: 'da-scholarship-bi-dashboard',
      difficulty: 'intermediate',
      title: 'Interactive State Scholarship Opportunity Dashboard',
      tag: 'Power BI / Tableau',
      summary: 'Build an executive-ready business intelligence dashboard analyzing scholarship distribution across Indian states, income tiers, and demographic categories.',
      requirements: [
        'Design a clean dimensional data model (Fact and Dimension tables)',
        'Create DAX / calculated measures for scholarship coverage, average aid amount, and state penetration',
        'Implement interactive slicers, drill-through paths, and KPI scorecard banners',
      ],
      skills_exercised: ['Power BI / Tableau', 'Data Modeling', 'DAX Calculations', 'Dashboard UX'],
      constraints: ['Follow high-contrast visual design hierarchy', "Include an 'About Data' disclaimer tile"],
      example_input_output: 'Public Power BI link or Tableau Public workbook + PDF executive summary.',
    },
    {
      id: 'da-labor-market-pipeline',
      difficulty: 'advanced',
      title: 'Automated Labor Market Insights ETL & Forecasting Pipeline',
      tag: 'SQL & ETL',
      summary: 'Build an automated ETL pipeline that ingests job posting datasets into PostgreSQL, transforms skill matrices with SQL window functions, and forecasts hiring trends.',
      requirements: [
        'Write automated Python extraction script loading raw data into normalized PostgreSQL tables',
        'Author complex SQL transformation queries utilizing window functions, CTEs, and aggregations',
        'Deploy an interactive Streamlit or Dash web app visualizing salary percentiles by skill',
      ],
      skills_exercised: ['PostgreSQL', 'Window Functions', 'Streamlit', 'Automated ETL Pipelines'],
      constraints: ['Automated idempotent seed script', 'Live interactive web interface'],
      example_input_output: 'Live Streamlit Web Application + GitHub Repo with SQL schema migrations.',
    },
  ],
};

export function getCareerProjects(careerId: string, careerTitle: string, cluster: string): SkillProject[] {
  if (CUSTOM_PROJECTS[careerId]) {
    return CUSTOM_PROJECTS[careerId];
  }
  return [
    {
      id: `${careerId}-starter-case`,
      difficulty: 'beginner',
      title: `Foundational ${careerTitle} Practice Case & Analysis`,
      tag: 'Case Study',
      summary: `Complete a structured baseline case study applying the core principles and documentation standards of ${careerTitle}.`,
      requirements: [
        `Identify the primary problem statement and regulatory constraints in a sample ${careerTitle} scenario`,
        'Execute the initial assessment calculation or structured diagnostic report',
        'Produce a clean, professional summary report with actionable recommendations',
      ],
      skills_exercised: ['Foundational Diagnostics', 'Domain Analysis', 'Report Writing'],
      constraints: ['Follow official Indian industry guidelines', 'Include reference citations'],
      example_input_output: 'Deliverable: 3-page structured PDF case analysis with executive summary.',
    },
    {
      id: `${careerId}-applied-project`,
      difficulty: 'intermediate',
      title: `Applied ${careerTitle} Solution Framework & Model`,
      tag: 'Applied Project',
      summary: `Design and execute a realistic multi-step project demonstrating intermediate competencies in ${cluster}.`,
      requirements: [
        'Develop a comprehensive project plan, budget estimation, or workflow blueprint',
        'Account for risk factors, local compliance, and cost considerations',
        'Present findings with visual diagrams, spreadsheets, or technical documentation',
      ],
      skills_exercised: ['Project Planning', 'Risk Assessment', 'Cost Estimation', 'Domain Tooling'],
      constraints: ['Budget and resource limits must match realistic Indian market benchmarks'],
      example_input_output: 'Deliverable: Complete project dossier with calculations and technical blueprints.',
    },
    {
      id: `${careerId}-capstone-portfolio`,
      difficulty: 'advanced',
      title: `${careerTitle} Comprehensive Capstone & Portfolio Presentation`,
      tag: 'Portfolio Capstone',
      summary: 'An end-to-end real-world capstone project demonstrating production readiness, ethical considerations, and cross-functional leadership.',
      requirements: [
        'Complete full lifecycle execution from initial requirement gathering to final delivery',
        'Incorporate quality audit, safety standards, and stakeholder presentation',
        'Publish a public portfolio presentation detailing methodology, hurdles overcome, and results',
      ],
      skills_exercised: ['End-to-End Execution', 'Quality Auditing', 'Stakeholder Presentation', 'Leadership'],
      constraints: ['Production-grade quality suitable for employer or licensing review'],
      example_input_output: 'Deliverable: Public repository, portfolio deck, or verified project submission.',
    },
  ];
}

const CUSTOM_TRAJECTORIES: Record<string, CareerTrajectoryItem[]> = {
  'software-developer': [
    {
      target_career_title: 'Senior Software Engineer / Tech Lead',
      trajectory_type: 'vertical_advancement',
      typical_years_experience: '3-5 years',
      expected_salary_delta_inr: '+₹8,00,000 - ₹18,00,000 / annum',
      required_delta_skills: ['System Architecture Design', 'Code Review Leadership', 'Distributed Systems', 'Sprint Mentorship'],
      transferable_skills_pct: 90,
      overview: 'Transitions from individual task coding to system architecture, performance optimization, and technical team mentorship.',
    },
    {
      target_career_title: 'Engineering Manager / Product Manager',
      trajectory_type: 'lateral_transition',
      typical_years_experience: '4-7 years',
      expected_salary_delta_inr: '+₹10,00,000 - ₹22,00,000 / annum',
      required_delta_skills: ['People Management', 'Product Roadmapping', 'Business KPI Alignment', 'Budgeting'],
      transferable_skills_pct: 70,
      overview: 'Pivots technical foundation into team leadership, product strategy, hiring, and business stakeholder delivery.',
    },
    {
      target_career_title: 'Cloud Architect / DevOps Lead',
      trajectory_type: 'specialization',
      typical_years_experience: '3-6 years',
      expected_salary_delta_inr: '+₹9,00,000 - ₹20,00,000 / annum',
      required_delta_skills: ['Kubernetes Clustering', 'Infrastructure as Code (Terraform)', 'Cloud Security', 'Cost Optimization'],
      transferable_skills_pct: 80,
      overview: 'Specializes in enterprise cloud reliability, infrastructure automation, zero-downtime deployments, and platform engineering.',
    },
  ],
  'ux-designer': [
    {
      target_career_title: 'Lead Product Designer / Design Manager',
      trajectory_type: 'vertical_advancement',
      typical_years_experience: '3-5 years',
      expected_salary_delta_inr: '+₹6,00,000 - ₹14,00,000 / annum',
      required_delta_skills: ['Design System Governance', 'Executive Stakeholder Negotiation', 'UX Research Operations'],
      transferable_skills_pct: 85,
      overview: 'Leads organizational design strategy, establishes multi-product design systems, and coaches junior designers.',
    },
    {
      target_career_title: 'Product Manager (Tech/Product)',
      trajectory_type: 'lateral_transition',
      typical_years_experience: '2-5 years',
      expected_salary_delta_inr: '+₹5,00,000 - ₹12,00,000 / annum',
      required_delta_skills: ['Unit Economics & Pricing', 'Agile Backlog Grooming', 'SQL Analytics', 'Market Sizing'],
      transferable_skills_pct: 65,
      overview: 'Combines deep customer empathy and UX prototyping speed with full business ownership and engineering coordination.',
    },
  ],
  'data-analyst': [
    {
      target_career_title: 'Senior BI Analyst / Analytics Manager',
      trajectory_type: 'vertical_advancement',
      typical_years_experience: '3-5 years',
      expected_salary_delta_inr: '+₹5,00,000 - ₹12,00,000 / annum',
      required_delta_skills: ['Executive Storytelling', 'Advanced Data Warehousing', 'Semantic Layer Design'],
      transferable_skills_pct: 85,
      overview: 'Directs business intelligence strategy, manages analytics team queues, and advises C-suite on operational metrics.',
    },
    {
      target_career_title: 'Data Scientist (Machine Learning)',
      trajectory_type: 'lateral_transition',
      typical_years_experience: '2-4 years',
      expected_salary_delta_inr: '+₹6,00,000 - ₹15,00,000 / annum',
      required_delta_skills: ['Machine Learning Algorithms', 'Predictive Modeling (scikit-learn)', 'Calculus & Linear Algebra'],
      transferable_skills_pct: 75,
      overview: 'Expands retrospective diagnostic analytics into forward-looking predictive modeling, recommendation engines, and ML systems.',
    },
    {
      target_career_title: 'Data Engineer (Big Data & Pipelines)',
      trajectory_type: 'specialization',
      typical_years_experience: '2-4 years',
      expected_salary_delta_inr: '+₹7,00,000 - ₹16,00,000 / annum',
      required_delta_skills: ['Apache Spark / PySpark', 'Airflow Orchestration', 'Distributed Storage', 'Data Lakehouse Design'],
      transferable_skills_pct: 70,
      overview: 'Specializes in building robust, scalable data ingestion pipelines and real-time streaming architectures.',
    },
  ],
};

export function getCareerTrajectories(careerId: string, careerTitle: string, cluster: string): CareerTrajectoryItem[] {
  if (CUSTOM_TRAJECTORIES[careerId]) {
    return CUSTOM_TRAJECTORIES[careerId];
  }
  return [
    {
      target_career_title: `Senior ${careerTitle} / Specialist Lead`,
      trajectory_type: 'vertical_advancement',
      typical_years_experience: '3-5 years',
      expected_salary_delta_inr: '+₹4,00,000 - ₹10,00,000 / annum',
      required_delta_skills: ['Advanced Case Leadership', 'Quality Assurance Management', 'Team Mentorship'],
      transferable_skills_pct: 85,
      overview: `Advances to senior execution, managing high-complexity projects and guiding junior professionals in ${cluster}.`,
    },
    {
      target_career_title: `${cluster} Operations Manager / Consultant`,
      trajectory_type: 'lateral_transition',
      typical_years_experience: '4-6 years',
      expected_salary_delta_inr: '+₹5,00,000 - ₹12,00,000 / annum',
      required_delta_skills: ['Budget & P&L Oversight', 'Strategic Planning', 'Client Relationship Management'],
      transferable_skills_pct: 70,
      overview: 'Transitions domain expertise into strategic management, independent consulting, or operational department oversight.',
    },
  ];
}
