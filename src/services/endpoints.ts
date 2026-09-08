/** Strongly typed endpoint functions. One place where a URL string appears. */

import { api } from '@/services/api_client';
import type {
  CareerCompareResponse,
  CareerDetail,
  CareerProjectsResponse,
  CareerSummary,
  CareerSyllabusResponse,
  CareerTrajectoryResponse,
  ChatMessageResponse,
  ConsentResponse,
  ErasureReceipt,
  Escalation,
  EscalationQueueResponse,
  EscalationStatus,
  EscalationTrigger,
  EvidenceType,
  GuardianContextResponse,
  Milestone,
  ParentSummaryResponse,
  PathwaySelectResponse,
  ProfileStatusResponse,
  ProjectSubmission,
  ReassessResponse,
  RecommendationBatch,
  RoadmapResponse,
  ScholarshipListResponse,
  SkillGapResponse,
  StudentProfileResponse,
  TokenResponse,
  UserResponse,
} from '@/types/models';
import type {
  GuardianContextInput,
  LoginInput,
  MinorConsentInput,
  OnboardingInput,
  RegisterInput,
} from '@/types/forms';

export const authApi = {
  register: (body: RegisterInput) => api.post<TokenResponse>('/auth/register', body),
  login: (body: LoginInput) => api.post<TokenResponse>('/auth/login', body),
  me: () => api.get<UserResponse>('/auth/me'),
  updateMe: (body: { full_name?: string; phone_number?: string | null }) =>
    api.patch<UserResponse>('/auth/me', body),
  recordMinorConsent: (body: MinorConsentInput) =>
    api.post<ConsentResponse>('/auth/minor-consent', body),
};

export const profileApi = {
  create: (body: OnboardingInput) => api.post<StudentProfileResponse>('/profile', body),
  get: () => api.get<StudentProfileResponse>('/profile'),
  patch: (body: Record<string, unknown>) => api.patch<StudentProfileResponse>('/profile', body),
  status: () => api.get<ProfileStatusResponse>('/profile/status'),
  upsertGuardian: (body: GuardianContextInput) =>
    api.post<GuardianContextResponse>('/profile/guardian', body),
};

export const careerApi = {
  list: (params?: { stage?: string; cluster?: string }) =>
    api.get<CareerSummary[]>('/careers', params),
  detail: (careerId: string) => api.get<CareerDetail>(`/careers/${careerId}`),
  compare: (careerIds: string[]) =>
    api.post<CareerCompareResponse>('/careers/compare', { career_ids: careerIds }),
  skillGaps: (careerId: string) => api.get<SkillGapResponse>(`/careers/${careerId}/skill-gaps`),
  syllabus: (careerId: string) =>
    api.get<CareerSyllabusResponse>(`/careers/${careerId}/syllabus`),
  projects: (careerId: string, difficulty?: string) =>
    api.get<CareerProjectsResponse>(`/careers/${careerId}/projects`, { difficulty }),
  trajectory: (careerId: string) =>
    api.get<CareerTrajectoryResponse>(`/careers/${careerId}/trajectory`),
};

export const projectApi = {
  submit: (
    projectId: string,
    body: { repository_or_live_url: string; reflection_notes?: string | null },
  ) => api.post<ProjectSubmission>(`/projects/${projectId}/submit`, body),
  mySubmissions: () => api.get<ProjectSubmission[]>('/projects/my-submissions'),
};

export const recommendationApi = {
  evaluate: () => api.post<RecommendationBatch>('/recommendations/evaluate'),
  current: () => api.get<RecommendationBatch>('/recommendations/current'),
  history: () => api.get<RecommendationBatch[]>('/recommendations/history'),
  selectPathways: (primaryCareerId: string, backupCareerId?: string | null) =>
    api.post<PathwaySelectResponse>('/recommendations/select-pathways', {
      primary_career_id: primaryCareerId,
      backup_career_id: backupCareerId ?? null,
    }),
  reassess: (reason?: string) =>
    api.post<ReassessResponse>('/recommendations/reassess', { reason: reason ?? null }),
};

export const roadmapApi = {
  current: () => api.get<RoadmapResponse>('/roadmap'),
  completeMilestone: (
    milestoneId: string,
    evidenceType: EvidenceType,
    note?: string | null,
  ) =>
    api.patch<Milestone>(`/roadmap/milestones/${milestoneId}/complete`, {
      completion_evidence_type: evidenceType,
      completion_evidence_note_or_url: note ?? null,
    }),
};

export const scholarshipApi = {
  search: (params: {
    state?: string;
    target_category?: string;
    min_qualification?: string;
    max_income_inr?: number;
    limit?: number;
    offset?: number;
  }) => api.get<ScholarshipListResponse>('/scholarships', params),
};

export const chatApi = {
  send: (question: string, careerId?: string | null) =>
    api.post<ChatMessageResponse>('/chat/message', {
      question,
      career_id: careerId ?? null,
    }),
};

export const guardianApi = {
  summary: (regenerate = false, studentId?: string) =>
    api.get<ParentSummaryResponse>('/guardian/summary', {
      regenerate,
      ...(studentId ? { student_id: studentId } : {}),
    }),
};

export const counselorApi = {
  queue: (status?: EscalationStatus) =>
    api.get<EscalationQueueResponse>('/counselor/queue', { status }),
  review: (
    escalationId: string,
    body: {
      status: EscalationStatus;
      counselor_notes?: string | null;
      counselor_override_decision?: string | null;
      counselor_override_rationale?: string | null;
    },
  ) => api.post<Escalation>(`/counselor/review/${escalationId}`, body),
};

export const escalationApi = {
  trigger: (triggerReason: EscalationTrigger, studentNote?: string) =>
    api.post<Escalation>('/escalations/trigger', {
      trigger_reason: triggerReason,
      student_note: studentNote ?? null,
    }),
};

export const accountApi = {
  export: () => api.get<any>('/account/export'),
  erase: () => api.delete<ErasureReceipt>('/account', { confirm_understanding: true }),
};
