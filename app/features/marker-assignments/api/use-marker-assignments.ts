import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardQueryKey } from "~/features/dashboard/api/use-dashboard";
import { markerAssignmentsService } from "~/features/marker-assignments/api/marker-assignments.service";
import type { CreateMarkerAssignmentRequest } from "~/features/marker-assignments/types";

export const markerAssignmentsQueryKey = (moduleId: string) =>
  ["marker-assignments", moduleId] as const;

export const markerCandidatesQueryKey = (moduleId: string) =>
  ["marker-candidates", moduleId] as const;

/** Every assignment in the module, in one fetch — there's no pagination anywhere in this API. */
export function useMarkerAssignments(moduleId: string | undefined) {
  return useQuery({
    queryKey: markerAssignmentsQueryKey(moduleId ?? ""),
    queryFn: () => markerAssignmentsService.getAssignments(moduleId as string),
    enabled: Boolean(moduleId),
  });
}

/**
 * Assignable markers. The backend already excludes anyone on this module, so the list shrinks as
 * assignments are made — which is why every mutation below invalidates this key as well as the
 * assignments key.
 */
export function useMarkerCandidates(moduleId: string | undefined) {
  return useQuery({
    queryKey: markerCandidatesQueryKey(moduleId ?? ""),
    queryFn: () => markerAssignmentsService.getCandidates(moduleId as string),
    enabled: Boolean(moduleId),
  });
}

/**
 * Everything a marker-assignment write has to invalidate.
 *
 * Three keys, not one. The assignments list is the obvious one; candidates because the backend
 * filters out markers already on the module, so the picker is stale the moment an assignment
 * lands; and the dashboard because its `markers[]` per student is the same data seen from the
 * marking-progress side, and it drives this screen's own roster.
 */
function useAssignmentInvalidation(moduleId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: markerAssignmentsQueryKey(moduleId) });
    queryClient.invalidateQueries({ queryKey: markerCandidatesQueryKey(moduleId) });
    queryClient.invalidateQueries({ queryKey: dashboardQueryKey(moduleId) });
  };
}

export function useAssignMarker(moduleId: string) {
  const invalidate = useAssignmentInvalidation(moduleId);
  return useMutation({
    mutationFn: ({
      studentId,
      request,
    }: {
      studentId: string;
      request: CreateMarkerAssignmentRequest;
    }) => markerAssignmentsService.assign(moduleId, studentId, request),
    onSuccess: invalidate,
  });
}

export function useUnassignMarker(moduleId: string) {
  const invalidate = useAssignmentInvalidation(moduleId);
  return useMutation({
    mutationFn: (assignmentId: string) =>
      markerAssignmentsService.unassign(moduleId, assignmentId),
    onSuccess: invalidate,
  });
}

export function useBulkAssignMarkers(moduleId: string) {
  const invalidate = useAssignmentInvalidation(moduleId);
  return useMutation({
    mutationFn: (file: File) => markerAssignmentsService.bulkAssign(moduleId, file),
    onSuccess: invalidate,
  });
}
