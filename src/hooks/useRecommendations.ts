/** TanStack Query hooks for profile, recommendations, and pathway selection. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/services/api_client';
import { careerApi, profileApi, recommendationApi } from '@/services/endpoints';
import type { OnboardingInput } from '@/types/forms';

export const queryKeys = {
  profile: ['profile'] as const,
  profileStatus: ['profile', 'status'] as const,
  recommendations: ['recommendations', 'current'] as const,
  recommendationHistory: ['recommendations', 'history'] as const,
  roadmap: ['roadmap'] as const,
  guardianSummary: ['guardian', 'summary'] as const,
  careers: (params?: Record<string, unknown>) => ['careers', params ?? {}] as const,
  career: (id: string) => ['careers', id] as const,
  skillGaps: (id: string) => ['careers', id, 'skill-gaps'] as const,
  syllabus: (careerId: string) => ['careers', careerId, 'syllabus'] as const,
  projects: (careerId: string, difficulty?: string) =>
    ['careers', careerId, 'projects', difficulty ?? 'all'] as const,
  trajectory: (careerId: string) => ['careers', careerId, 'trajectory'] as const,
  projectSubmissions: ['projects', 'my-submissions'] as const,
  scholarships: (params: Record<string, unknown>) => ['scholarships', params] as const,
  counselorQueue: (status?: string) => ['counselor', 'queue', status ?? 'all'] as const,
};

/** 404 means "not created yet", which is a normal state, not an error worth retrying. */
function retryUnlessExpected(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 404 || error.status === 403 || error.isUnauthorized) return false;
  }
  return failureCount < 2;
}

export function useProfileStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profileStatus,
    queryFn: profileApi.status,
    enabled,
    retry: retryUnlessExpected,
  });
}

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: profileApi.get,
    enabled,
    retry: retryUnlessExpected,
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardingInput) => profileApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileStatus });
    },
  });
}

export function usePatchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, unknown>) => profileApi.patch(updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileStatus });
    },
  });
}

export function useRecommendations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.recommendations,
    queryFn: recommendationApi.current,
    enabled,
    retry: retryUnlessExpected,
    // FR-19: served from cache on a stalled connection rather than showing a spinner
    // the student cannot get past.
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useEvaluate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recommendationApi.evaluate,
    onSuccess: (batch) => {
      queryClient.setQueryData(queryKeys.recommendations, batch);
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendationHistory });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guardianSummary });
    },
  });
}

export function useRecommendationHistory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.recommendationHistory,
    queryFn: recommendationApi.history,
    enabled,
    retry: retryUnlessExpected,
  });
}

export function useSelectPathways() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ primary, backup }: { primary: string; backup?: string | null }) =>
      recommendationApi.selectPathways(primary, backup),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roadmap });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
    },
  });
}

export function useReassess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => recommendationApi.reassess(reason),
    onSuccess: () => {
      // A reassessment supersedes the batch, the roadmap, and the guardian summary
      // together — refreshing only one would show the student a mixed state.
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recommendationHistory });
      void queryClient.invalidateQueries({ queryKey: queryKeys.roadmap });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guardianSummary });
    },
  });
}

export function useCareer(careerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.career(careerId ?? ''),
    queryFn: () => careerApi.detail(careerId as string),
    enabled: Boolean(careerId),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCareers(params?: { stage?: string; cluster?: string }) {
  return useQuery({
    queryKey: queryKeys.careers(params),
    queryFn: () => careerApi.list(params),
    staleTime: 30 * 60 * 1000,
  });
}

export function useSkillGaps(careerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.skillGaps(careerId ?? ''),
    queryFn: () => careerApi.skillGaps(careerId as string),
    enabled: Boolean(careerId),
    retry: retryUnlessExpected,
  });
}

export function useCompareCareers() {
  return useMutation({
    mutationFn: (careerIds: string[]) => careerApi.compare(careerIds),
  });
}
