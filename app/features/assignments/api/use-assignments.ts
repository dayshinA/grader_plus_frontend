import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { assignmentsService } from "~/features/assignments/api/assignments.service";
import type {
  AutoAssignPayload,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
} from "~/features/assignments/types";
import { dashboardKeys } from "~/features/dashboard/api/use-dashboard";

export const assignmentKeys = {
  all: ["assignments"] as const,
  list: (offeringId: string) => [...assignmentKeys.all, "list", offeringId] as const,
  markers: (offeringId: string) => [...assignmentKeys.all, "markers", offeringId] as const,
  coverage: (offeringId: string) => [...assignmentKeys.all, "coverage", offeringId] as const,
};

export function useAssignments(offeringId: string | undefined) {
  return useQuery({
    queryKey: assignmentKeys.list(offeringId ?? ""),
    queryFn: () => assignmentsService.list(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 15 * 1000,
  });
}

export function useEligibleMarkers(offeringId: string | undefined) {
  return useQuery({
    queryKey: assignmentKeys.markers(offeringId ?? ""),
    queryFn: () => assignmentsService.eligibleMarkers(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 60 * 1000,
  });
}

export function useCoverage(offeringId: string | undefined) {
  return useQuery({
    queryKey: assignmentKeys.coverage(offeringId ?? ""),
    queryFn: () => assignmentsService.coverage(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 15 * 1000,
  });
}

/** Somebody else can change an allocation too, so everything is refetched, never patched. */
function invalidate(queryClient: ReturnType<typeof useQueryClient>, offeringId: string) {
  void queryClient.invalidateQueries({ queryKey: assignmentKeys.list(offeringId) });
  void queryClient.invalidateQueries({ queryKey: assignmentKeys.coverage(offeringId) });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useCreateAssignment(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) =>
      assignmentsService.create(offeringId, payload),
    onSuccess: () => invalidate(queryClient, offeringId),
  });
}

export function useUpdateAssignment(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      payload,
    }: {
      assignmentId: string;
      payload: UpdateAssignmentPayload;
    }) => assignmentsService.updateRole(assignmentId, payload),
    onSuccess: () => invalidate(queryClient, offeringId),
  });
}

export function useRemoveAssignment(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => assignmentsService.remove(assignmentId),
    onSuccess: () => invalidate(queryClient, offeringId),
  });
}

/** Returns a preview only. Applying it is a separate set of create calls. */
export function useProposeAuto(offeringId: string) {
  return useMutation({
    mutationFn: (payload: AutoAssignPayload) =>
      assignmentsService.proposeAuto(offeringId, payload),
  });
}

export function useImportAssignments(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => assignmentsService.importMatrix(offeringId, file),
    onSuccess: () => invalidate(queryClient, offeringId),
  });
}

export function useOpenMarking(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => assignmentsService.openMarking(offeringId),
    onSuccess: () => {
      invalidate(queryClient, offeringId);
      void queryClient.invalidateQueries({ queryKey: ["structure"] });
    },
  });
}
