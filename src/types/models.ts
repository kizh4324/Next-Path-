/**
 * TypeScript mirrors of the backend Pydantic models.
 *
 * These must stay in step with `backend/app/schemas/` — the API is the contract, and a
 * silent drift here surfaces as an undefined at render time rather than a type error
 * (coding-standards.md §2.1).
 */

// --- Enums (values match the database CHECK constraints exactly) ---------------------
export type EducationStage = 'class_8_10' | 'class_11_12' | 'early_college';
export type UserRole = 'student' | 'guardian' | 'counselor' | 'admin';
export type ConsentType = 'guardian_consent_minor' | 'self_consent_adult';
export type BudgetTier = 'low_cost_only' | 'moderate_up_to_2_lakhs' | 'flexible_above_2_lakhs';
export type RelocationWillingness =
  | 'home_district_only'
  | 'within_state'
  | 'anywhere_in_india'
  | 'abroad';

export type FitLabel = 'Strong' | 'Moderate' | 'Emerging' | 'Insufficient evidence';
export type FeasibilityLabel = 'High' | 'Moderate' | 'Challenging' | 'Low';
export type EvidenceQualityLabel = 'High' | 'Moderate' | 'Preliminary' | 'Sparse';

export type SkillCategory = 'essential' | 'useful' | 'optional';
export type SponsorType = 'Government' | 'Private' | 'Institutional';
export type DemandIndicator = 'High' | 'Moderate' | 'Emerging' | 'Stable' | 'Niche';
export type TimeframeBucket = 'next_7_days' | 'day_30' | 'day_90' | 'day_180';
export type MilestoneType =
  | 'exploration'
  | 'foundational_learning'
  | 'skill_check'
  | 'exam_prep'
  | 'project_output'
  | 'scholarship_application'
  | 'reassessment';
export type EvidenceType =
  | 'self_report'
  | 'project_artifact'
  | 'quiz_score'
  | 'mentor_confirmation';
export type RoadmapStatus = 'active' | 'paused' | 'completed' | 'reassessing';
export type EscalationTrigger =
  | 'high_stakes_choice'
  | 'severe_constraint_conflict'
  | 'student_parent_deadlock'
  | 'low_evidence_profile'
  | 'student_requested'
  | 'crisis_safety_flag';
export type EscalationStatus =
  | 'pending'
  | 'under_review'
  | 'session_scheduled'
  | 'resolved'
  | 'overridden';

export type RiasecKey = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

// --- Auth ----------------------------------------------------------------------------
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user_id: string;
  role: UserRole;
  full_name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ConsentResponse {
  student_profile_id: string;
  consent_type: string;
  consent_given_by: string | null;
  consent_recorded_at: string;
  message: string;
}

// --- Profile -------------------------------------------------------------------------
export interface InterestEntry {
  label: string;
  riasec: RiasecKey | null;
  strength: number;
}

export interface GuardianContextResponse {
  id: string;
  student_id: string;
  guardian_name: string | null;
  relationship_to_student: string;
  guardian_priorities: string[];
  financial_ceiling_inr: number | null;
  relocation_restriction: RelocationWillingness;
  notes_and_concerns: string | null;
  created_at: string;
}

export interface StudentProfileResponse {
  id: string;
  user_id: string;
  education_stage: EducationStage;
  grade_or_year: string;
  current_stream: string | null;
  degree?: string | null;
  engineering_branch?: string | null;
  interests: InterestEntry[];
  aptitude_signals: Record<string, number>;
  work_style_preferences: Record<string, string>;
  budget_tier: BudgetTier;
  relocation_willingness: RelocationWillingness;
  preferred_languages: string[];
  consent_type: ConsentType;
  consent_given_by: string | null;
  consent_recorded_at: string;
  academic_records_available: boolean;
  profile_completeness_pct: number;
  created_at: string;
  updated_at: string;
  guardian_contexts: GuardianContextResponse[];
}

/** Tells the app which gate to show next: onboarding, consent, or results. */
export interface ProfileStatusResponse {
  profile_exists: boolean;
  profile_completeness_pct: number;
  is_minor_stage: boolean;
  consent_required: boolean;
  consent_recorded: boolean;
  can_generate_recommendations: boolean;
  blocking_reason: string | null;
}

// --- Catalogue -------------------------------------------------------------------------
export interface IndiaEntryRoute {
  route_name: string;
  duration_years: number;
  entrance_exams: string[];
  cost_tier: BudgetTier;
  estimated_cost_inr_min: number;
  estimated_cost_inr_max: number;
  degree_or_cert_awarded: string;
  low_cost_alternative_route: string | null;
  availability_scope: RelocationWillingness;
}

export interface CareerSkill {
  id: string;
  career_id: string;
  skill_name: string;
  category: SkillCategory;
  description: string;
  free_learning_resource_name: string;
  free_learning_resource_url: string;
  paid_learning_resource_name: string | null;
  paid_learning_resource_url: string | null;
  commercial_disclosure: string;
}

export interface MarketSnapshot {
  id: string;
  career_id: string;
  geography: string;
  timeframe_period: string;
  data_source: string;
  demand_indicator: DemandIndicator;
  salary_range_entry_inr: string;
  salary_range_mid_inr: string;
  top_demanded_skills: { skill: string; postings: number; share_pct: number }[];
  top_hiring_locations: { location: string; postings: number; share_pct: number }[];
  experience_distribution: Record<string, number>;
  competition_caveat: string;
  uncertainty_statement: string;
  last_updated_date: string;
}

/**
 * Returned in place of a market snapshot where no verified data exists. Rendering this
 * rather than an empty section is what keeps absence of evidence visible.
 */
export interface EvidenceUnavailable {
  available: false;
  reason: string;
  what_would_help: string;
}

export interface CareerSummary {
  id: string;
  title: string;
  cluster: string;
  description: string;
  job_zone: number;
  riasec_code: string;
  applicable_stages: EducationStage[];
  india_entry_routes: IndiaEntryRoute[];
  risks_and_tradeoffs: string[];
  last_reviewed_date: string;
}

export interface CareerDetail extends CareerSummary {
  onet_soc_code: string;
  work_reality_summary: string;
  riasec_scores: Record<string, number>;
  prerequisites: string[];
  regional_caveats: string | null;
  content_owner: string;
  review_cycle_months: number;
  source_links: string[];
  skills: CareerSkill[];
  market_snapshot: MarketSnapshot | null;
  market_evidence_unavailable: EvidenceUnavailable | null;
}

export interface ComparisonRow {
  dimension: string;
  values: Record<string, string>;
  note: string | null;
}

export interface CareerCompareResponse {
  careers: CareerSummary[];
  rows: ComparisonRow[];
  careers_without_market_evidence: string[];
}

export interface Scholarship {
  id: number;
  name: string;
  state: string;
  sponsor_type: SponsorType;
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
}

export interface ScholarshipListResponse {
  total: number;
  results: Scholarship[];
  coverage_note: string;
}

// --- Recommendations -------------------------------------------------------------------
export interface Recommendation {
  id: string;
  career_id: string;
  career_title: string;
  rank_position: number;
  composite_score: number;
  fit_score: number;
  feasibility_score: number;
  evidence_quality_score: number;
  fit_label: FitLabel;
  feasibility_label: FeasibilityLabel;
  evidence_quality_label: EvidenceQualityLabel;
  reasons: string[];
  concerns: string[];
  missing_evidence_flags: string[];
  is_primary_selection: boolean;
  is_backup_selection: boolean;
  created_at: string;
  career: CareerSummary | null;
}

export interface RecommendationBatch {
  id: string;
  student_id: string;
  batch_number: number;
  is_current: boolean;
  superseded_at: string | null;
  created_at: string;
  recommendations: Recommendation[];
  decision_support_notice: string;
}

export interface PathwaySelectResponse {
  roadmap_id: string;
  primary_career_id: string;
  backup_career_id: string | null;
  milestones_created: number;
  message: string;
}

export interface ReassessResponse {
  new_batch_id: string;
  new_batch_number: number;
  superseded_batch_ids: string[];
  superseded_roadmap_ids: string[];
  history_preserved: boolean;
  message: string;
}

// --- Roadmap ---------------------------------------------------------------------------
export interface Milestone {
  id: string;
  roadmap_id: string;
  timeframe_bucket: TimeframeBucket;
  order_index: number;
  title: string;
  description: string;
  milestone_type: MilestoneType;
  prerequisites: string[];
  estimated_cost_inr: number;
  is_low_cost_or_free: boolean;
  free_resource_url: string | null;
  completion_evidence_type: EvidenceType;
  completion_evidence_note_or_url: string | null;
  is_completed: boolean;
  completed_at: string | null;
  fallback_action: string;
  is_locked: boolean;
  blocked_by: string[];
}

export interface RoadmapResponse {
  id: string;
  student_id: string;
  primary_career_id: string;
  primary_career_title: string;
  backup_career_id: string | null;
  backup_career_title: string | null;
  status: RoadmapStatus;
  is_current: boolean;
  superseded_at: string | null;
  created_at: string;
  milestones: Milestone[];
  total_milestones: number;
  completed_milestones: number;
  total_estimated_cost_inr: number;
  free_milestone_count: number;
}

export interface SkillGapItem {
  skill_name: string;
  category: SkillCategory;
  description: string;
  is_already_held: boolean;
  free_learning_resource_name: string;
  free_learning_resource_url: string;
  commercial_disclosure: string;
}

export interface SkillGapResponse {
  career_id: string;
  career_title: string;
  essential: SkillGapItem[];
  useful: SkillGapItem[];
  optional: SkillGapItem[];
  gap_count_essential: number;
  free_first_note: string;
}

// --- Chat ------------------------------------------------------------------------------
export interface SourceCitation {
  career_id: string;
  career_title: string;
  last_reviewed_date: string;
}

export interface ChatMessageResponse {
  answer: string;
  citations: SourceCitation[];
  career_ids_injected: string[];
  is_crisis_response: boolean;
  was_escalated: boolean;
  ai_unavailable: boolean;
  disclaimer: string;
  interaction_id: string | null;
}

/** Local-only view model — the API is single-turn and keeps no history. */
export interface ChatTurn {
  id: string;
  question: string;
  response: ChatMessageResponse | null;
  pending: boolean;
  failed?: boolean;
}

// --- Guardian ----------------------------------------------------------------------------
export interface CostBreakdownItem {
  career_title: string;
  route_name: string;
  duration_years: number;
  estimated_cost_inr_min: number;
  estimated_cost_inr_max: number;
  entrance_exams: string[];
  low_cost_alternative_route: string | null;
}

export interface ChildProgressStudent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  education_stage: string;
  grade_or_year?: string | null;
  stream: string | null;
  current_focus: string;
  assessment_status: 'completed' | 'in_progress' | 'not_started';
  last_assessment_date: string | null;
}

export interface AssessmentDimension {
  name: string;
  label: 'Strong' | 'Moderate' | 'Developing' | 'Insufficient evidence';
  notes?: string;
}

export interface AssessmentOverview {
  status: 'completed' | 'in_progress' | 'not_started';
  dimensions: AssessmentDimension[];
  last_completed_at: string | null;
}

export interface ChildProgressRoadmap {
  total_milestones: number;
  completed_milestones: number;
  completion_percentage: number;
  completed_items: string[];
  upcoming_items: string[];
}

export interface CareerOptionItem {
  id: string;
  career_title: string;
  fit_label: string;
  feasibility_label: string;
  cost_range: string;
  duration: string;
  route_name: string;
  low_cost_alternative: string | null;
  scholarship_available: boolean;
}

export interface FamilyDiscussionInfo {
  prompts: string[];
  helper_text: string;
  guide_tips: string[];
}

export interface ReassessmentInfo {
  next_review_days: number;
  next_review_label: string;
  note: string;
}

export interface ParentSummaryResponse {
  id?: string | null;
  student_id?: string;
  recommendation_batch_id?: string;
  summary_text?: string;
  generated_at?: string | null;
  cost_breakdown?: CostBreakdownItem[];
  discussion_points?: string[];
  guardian_priorities_reflected?: string[];
  generated_without_ai?: boolean;

  // Rich Child Progress Dashboard fields
  student?: ChildProgressStudent;
  assessment_overview?: AssessmentOverview;
  progress?: ChildProgressRoadmap;
  career_options?: CareerOptionItem[];
  pathway_feasibility?: CareerOptionItem[];
  family_priorities?: string[];
  next_steps?: string[];
  family_discussion?: FamilyDiscussionInfo;
  reassessment?: ReassessmentInfo;
}

// --- Counselor ----------------------------------------------------------------------------
export interface Escalation {
  id: string;
  student_id: string | null;
  trigger_reason: EscalationTrigger;
  status: EscalationStatus;
  student_summary_snapshot: Record<string, unknown>;
  counselor_user_id: string | null;
  counselor_notes: string | null;
  counselor_override_decision: string | null;
  counselor_override_rationale: string | null;
  scheduled_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  is_anonymized: boolean;
  urgency_rank: number;
}

export interface EscalationQueueResponse {
  total: number;
  results: Escalation[];
  crisis_count: number;
}

export interface ErasureReceipt {
  user_id: string;
  deleted_profile: boolean;
  deleted_guardian_contexts: number;
  deleted_roadmaps: number;
  deleted_recommendation_batches: number;
  deleted_chat_interactions: number;
  anonymized_chat_interactions: number;
  anonymized_escalations: number;
  retention_note: string;
}

/** RFC 7807 problem details, as returned by every error path in the API. */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: { field: string; message: string; type: string }[];
}

// --- Topic Syllabus, Skill Projects & Career Trajectories (Epic 7 / roadmap.sh) ---

export interface TopicItem {
  id: number;
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
  topics: TopicItem[];
}

export interface CareerSyllabusResponse {
  career_id: string;
  career_title: string;
  total_estimated_hours: number;
  phases: SyllabusPhase[];
}

export type ProjectDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface SkillProjectIdea {
  id: string;
  career_id: string;
  difficulty: ProjectDifficulty;
  title: string;
  tag: string;
  summary: string;
  requirements: string[];
  skills_exercised: string[];
  constraints: string[];
  example_input_output: string | null;
}

export interface CareerProjectsResponse {
  career_id: string;
  career_title: string;
  projects: SkillProjectIdea[];
}

export interface ProjectSubmission {
  id: string;
  student_id: string;
  project_id: string;
  repository_or_live_url: string;
  reflection_notes: string | null;
  status: string;
  submitted_at: string;
}

export type TrajectoryType = 'vertical_advancement' | 'lateral_transition' | 'specialization';

export interface CareerTrajectory {
  id: number;
  source_career_id: string;
  target_career_title: string;
  trajectory_type: TrajectoryType;
  typical_years_experience: string;
  expected_salary_delta_inr: string;
  required_delta_skills: string[];
  transferable_skills_pct: number;
  overview: string;
}

export interface CareerTrajectoryResponse {
  source_career_id: string;
  source_career_title: string;
  trajectories: CareerTrajectory[];
}

