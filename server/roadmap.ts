import { Career } from './data/seedData';

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

export interface Milestone {
  id: string;
  roadmap_id: string;
  timeframe_bucket: TimeframeBucket;
  title: string;
  description: string;
  milestone_type: MilestoneType;
  estimated_hours: number;
  is_free_or_low_cost: boolean;
  cost_estimate_inr: number;
  action_url: string | null;
  fallback_action: string;
  is_completed: boolean;
  completion_evidence_type: EvidenceType | null;
  completion_evidence_note_or_url: string | null;
  completed_at: string | null;
}

export interface RoadmapResponse {
  id: string;
  student_id: string;
  primary_career_id: string;
  backup_career_id: string | null;
  status: 'active' | 'paused' | 'completed' | 'reassessing';
  milestones: Milestone[];
  overall_progress_pct: number;
  created_at: string;
  updated_at: string;
}

export function generateAdaptiveRoadmap(
  roadmapId: string,
  studentId: string,
  primaryCareer: Career,
  backupCareer: Career | null,
  _educationStage: string = 'class_11_12',
): RoadmapResponse {
  const milestones: Milestone[] = [];
  let mCounter = 1;

  const makeId = () => `m-${roadmapId.slice(0, 8)}-${mCounter++}`;

  const exams = primaryCareer.india_entry_routes?.flatMap((r) => r.entrance_exams || []) || [];
  const primaryExam = exams[0] || null;
  const primaryRoute = primaryCareer.india_entry_routes?.[0];
  const essentialSkills = primaryCareer.skills.filter((s) => s.category === 'essential');
  const leadSkill = essentialSkills[0]?.skill_name || 'Core Problem Solving';
  const secondarySkill = essentialSkills[1]?.skill_name || 'Domain Tooling';

  // 1. Next 7 Days (Bucket 1: Exploration & Orientation)
  milestones.push({
    id: makeId(),
    roadmap_id: roadmapId,
    timeframe_bucket: 'next_7_days',
    title: `Explore Daily Work Reality of ${primaryCareer.title}`,
    description: `Review the day-in-the-life summary, key challenges, and regional prospects for ${primaryCareer.title}. Read the authored caveats to confirm expectations.`,
    milestone_type: 'exploration',
    estimated_hours: 3,
    is_free_or_low_cost: true,
    cost_estimate_inr: 0,
    action_url: primaryCareer.source_links?.[0] || 'https://www.ncs.gov.in',
    fallback_action: backupCareer
      ? `If ${primaryCareer.title} feels misaligned, review the profile breakdown for ${backupCareer.title}.`
      : 'Discuss daily work realities with a school teacher or school counselor.',
    is_completed: false,
    completion_evidence_type: null,
    completion_evidence_note_or_url: null,
    completed_at: null,
  });

  milestones.push({
    id: makeId(),
    roadmap_id: roadmapId,
    timeframe_bucket: 'next_7_days',
    title: `Audit Baseline Readiness for ${leadSkill}`,
    description: `Self-evaluate current familiarity with ${leadSkill} using free introductory practice materials. Identify where foundational tutoring or practice is needed.`,
    milestone_type: 'foundational_learning',
    estimated_hours: 4,
    is_free_or_low_cost: true,
    cost_estimate_inr: 0,
    action_url: 'https://swayam.gov.in',
    fallback_action: 'Focus on high-school fundamental concepts through free NCERT textbooks.',
    is_completed: false,
    completion_evidence_type: null,
    completion_evidence_note_or_url: null,
    completed_at: null,
  });

  // 2. 30 Days (Bucket 2: Foundation & Exam Mapping)
  if (primaryExam) {
    milestones.push({
      id: makeId(),
      roadmap_id: roadmapId,
      timeframe_bucket: 'day_30',
      title: `Map Exam Pattern & Eligibility for ${primaryExam}`,
      description: `Download official syllabus, test structure, and previous 3 years question papers for ${primaryExam}. Calculate realistic score targets.`,
      milestone_type: 'exam_prep',
      estimated_hours: 12,
      is_free_or_low_cost: true,
      cost_estimate_inr: 0,
      action_url: 'https://nta.ac.in',
      fallback_action: primaryRoute?.low_cost_alternative_route
        ? `Explore merit-based or state direct-entry route: ${primaryRoute.low_cost_alternative_route}.`
        : 'Consult state university direct admission guidelines based on 10+2 board marks.',
      is_completed: false,
      completion_evidence_type: null,
      completion_evidence_note_or_url: null,
      completed_at: null,
    });
  }

  milestones.push({
    id: makeId(),
    roadmap_id: roadmapId,
    timeframe_bucket: 'day_30',
    title: `Complete Free Online Course Module in ${secondarySkill}`,
    description: `Enroll in a certified free introductory module on SWAYAM, NPTEL, or YouTube to build verified confidence in ${secondarySkill}.`,
    milestone_type: 'foundational_learning',
    estimated_hours: 15,
    is_free_or_low_cost: true,
    cost_estimate_inr: 0,
    action_url: 'https://nptel.ac.in',
    fallback_action: 'Read introductory reference books from the local or school library.',
    is_completed: false,
    completion_evidence_type: null,
    completion_evidence_note_or_url: null,
    completed_at: null,
  });

  // 3. 90 Days (Bucket 3: Applied Output & Skill Check)
  milestones.push({
    id: makeId(),
    roadmap_id: roadmapId,
    timeframe_bucket: 'day_90',
    title: `Build & Submit Starter Project for ${primaryCareer.title}`,
    description: `Complete the Beginner project specification from the Skill Project Lab. Share repository link or write-up artifact for verification.`,
    milestone_type: 'project_output',
    estimated_hours: 20,
    is_free_or_low_cost: true,
    cost_estimate_inr: 0,
    action_url: null,
    fallback_action: 'Complete a concise written case study or diagrammatic summary.',
    is_completed: false,
    completion_evidence_type: null,
    completion_evidence_note_or_url: null,
    completed_at: null,
  });

  milestones.push({
    id: makeId(),
    roadmap_id: roadmapId,
    timeframe_bucket: 'day_90',
    title: `National / State Scholarship Search & Verification`,
    description: `Verify eligibility for central and state scholarship schemes (e.g. NSP, state DBT schemes) matching family income and education stage.`,
    milestone_type: 'scholarship_application',
    estimated_hours: 6,
    is_free_or_low_cost: true,
    cost_estimate_inr: 0,
    action_url: 'https://scholarships.gov.in',
    fallback_action: 'Check institutional fee-waiver categories directly at target college financial aid desks.',
    is_completed: false,
    completion_evidence_type: null,
    completion_evidence_note_or_url: null,
    completed_at: null,
  });

  // 4. 180 Days (Bucket 4: Capstone & Decision Gate)
  milestones.push({
    id: makeId(),
    roadmap_id: roadmapId,
    timeframe_bucket: 'day_180',
    title: `Comprehensive Milestone Review & Pathway Finalization`,
    description: `Evaluate completed project artifacts, exam mock scores, and family financial feasibility. Confirm readiness or initiate structured reassessment.`,
    milestone_type: 'reassessment',
    estimated_hours: 8,
    is_free_or_low_cost: true,
    cost_estimate_inr: 0,
    action_url: null,
    fallback_action: backupCareer
      ? `Switch active roadmap to backup option: ${backupCareer.title}.`
      : 'Request human counselor intervention to review alternate regional degree paths.',
    is_completed: false,
    completion_evidence_type: null,
    completion_evidence_note_or_url: null,
    completed_at: null,
  });

  const now = new Date().toISOString();
  return {
    id: roadmapId,
    student_id: studentId,
    primary_career_id: primaryCareer.id,
    backup_career_id: backupCareer ? backupCareer.id : null,
    status: 'active',
    milestones,
    overall_progress_pct: 0,
    created_at: now,
    updated_at: now,
  };
}
