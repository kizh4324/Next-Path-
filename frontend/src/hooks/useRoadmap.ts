/** Roadmap, milestone completion, scholarships, and the guardian summary. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/services/api_client';
import { careerApi, guardianApi, projectApi, roadmapApi, scholarshipApi } from '@/services/endpoints';
import { queryKeys } from '@/hooks/useRecommendations';
import type { EvidenceType } from '@/types/models';

function retryUnlessExpected(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return false;
  return failureCount < 2;
}

export function useRoadmap(enabled = true) {
  return useQuery({
    queryKey: queryKeys.roadmap,
    queryFn: roadmapApi.current,
    enabled,
    retry: retryUnlessExpected,
    // The roadmap is the screen a student returns to most, often on a poor connection.
    staleTime: 2 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useCompleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      milestoneId,
      evidenceType,
      note,
    }: {
      milestoneId: string;
      evidenceType: EvidenceType;
      note?: string | null;
    }) => roadmapApi.completeMilestone(milestoneId, evidenceType, note),
    onSuccess: () => {
      // Refetch the whole roadmap rather than patching one milestone: completing a
      // prerequisite unlocks other milestones, and that lock state is computed server-side.
      void queryClient.invalidateQueries({ queryKey: queryKeys.roadmap });
    },
  });
}

export function useScholarships(params: {
  state?: string;
  target_category?: string;
  min_qualification?: string;
  max_income_inr?: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...query } = params;
  return useQuery({
    queryKey: queryKeys.scholarships(query),
    queryFn: () => scholarshipApi.search(query),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}

export function useGuardianSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.guardianSummary,
    queryFn: () => guardianApi.summary(false),
    enabled,
    retry: retryUnlessExpected,
    // Never refetched in the background: the stored wording must not shift under a
    // family mid-conversation (FR-17).
    staleTime: Infinity,
  });
}

export function useCareerSyllabus(careerId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.syllabus(careerId ?? ''),
    queryFn: () => careerApi.syllabus(careerId!),
    enabled: enabled && Boolean(careerId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCareerProjects(
  careerId: string | null | undefined,
  difficulty?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.projects(careerId ?? '', difficulty),
    queryFn: () => careerApi.projects(careerId!, difficulty),
    enabled: enabled && Boolean(careerId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCareerTrajectory(careerId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.trajectory(careerId ?? ''),
    queryFn: () => careerApi.trajectory(careerId!),
    enabled: enabled && Boolean(careerId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useProjectSubmissions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.projectSubmissions,
    queryFn: projectApi.mySubmissions,
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSubmitProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      repositoryOrLiveUrl,
      reflectionNotes,
    }: {
      projectId: string;
      repositoryOrLiveUrl: string;
      reflectionNotes?: string | null;
    }) =>
      projectApi.submit(projectId, {
        repository_or_live_url: repositoryOrLiveUrl,
        reflection_notes: reflectionNotes,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectSubmissions });
    },
  });
}

