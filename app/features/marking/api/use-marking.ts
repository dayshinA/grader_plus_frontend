import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "~/features/dashboard/api/use-dashboard";
import { markingService } from "~/features/marking/api/marking.service";
import type {
  CreateAnnotationPayload,
  PutFeedbackPayload,
  PutScoresPayload,
  UpdateAnnotationPayload,
} from "~/features/marking/types";

export const markingKeys = {
  all: ["marking"] as const,
  queue: () => [...markingKeys.all, "queue"] as const,
  workspace: (projectId: string) => [...markingKeys.all, "workspace", projectId] as const,
  annotations: (submissionId: string) =>
    [...markingKeys.all, "annotations", submissionId] as const,
};

export function useMarkingQueue(enabled = true) {
  return useQuery({
    queryKey: markingKeys.queue(),
    queryFn: () => markingService.queue(),
    staleTime: 30 * 1000,
    enabled,
  });
}

export function useMarkingWorkspace(projectId: string | undefined) {
  return useQuery({
    queryKey: markingKeys.workspace(projectId ?? ""),
    queryFn: () => markingService.workspace(projectId as string),
    enabled: Boolean(projectId),
    // The workspace is refetched on demand rather than on a timer: an autosave in flight
    // must not be overwritten by a background read of what the server had a moment ago.
    staleTime: Infinity,
  });
}

/**
 * Autosave. Deliberately does not invalidate the workspace: the response carries the
 * recomputed total, and refetching mid typing would fight the form. The queue and the
 * dashboards are refreshed on submit instead.
 */
export function useSaveScores(projectId: string) {
  return useMutation({
    mutationFn: (payload: PutScoresPayload) => markingService.saveScores(projectId, payload),
  });
}

export function useSaveFeedback(projectId: string) {
  return useMutation({
    mutationFn: (payload: PutFeedbackPayload) => markingService.saveFeedback(projectId, payload),
  });
}

export function useSubmitEvaluation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markingService.submit(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: markingKeys.workspace(projectId) });
      void queryClient.invalidateQueries({ queryKey: markingKeys.queue() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

/** The caller's own pins on one file. There is no route that returns anybody else's. */
export function useAnnotations(submissionId: string | undefined) {
  return useQuery({
    queryKey: markingKeys.annotations(submissionId ?? ""),
    queryFn: () => markingService.annotations(submissionId as string),
    enabled: Boolean(submissionId),
    staleTime: 30 * 1000,
  });
}

export function useCreateAnnotation(submissionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAnnotationPayload) =>
      markingService.createAnnotation(submissionId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: markingKeys.annotations(submissionId) });
    },
  });
}

export function useUpdateAnnotation(submissionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      annotationId,
      payload,
    }: {
      annotationId: string;
      payload: UpdateAnnotationPayload;
    }) => markingService.updateAnnotation(annotationId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: markingKeys.annotations(submissionId) });
    },
  });
}

export function useDeleteAnnotation(submissionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (annotationId: string) => markingService.deleteAnnotation(annotationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: markingKeys.annotations(submissionId) });
    },
  });
}
