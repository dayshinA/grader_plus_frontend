import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "~/features/dashboard/api/use-dashboard";
import { gradingService } from "~/features/grading/api/grading.service";
import type {
  OverrideGradePayload,
  ResolveDiscrepancyPayload,
} from "~/features/grading/types";
import { structureKeys } from "~/features/structure/api/use-structure";

export const gradingKeys = {
  all: ["grading"] as const,
  discrepancies: (offeringId: string) =>
    [...gradingKeys.all, "discrepancies", offeringId] as const,
  discrepancy: (caseId: string) => [...gradingKeys.all, "discrepancy", caseId] as const,
  grades: (offeringId: string) => [...gradingKeys.all, "grades", offeringId] as const,
  grade: (projectId: string) => [...gradingKeys.all, "grade", projectId] as const,
};

export function useDiscrepancies(offeringId: string | undefined) {
  return useQuery({
    queryKey: gradingKeys.discrepancies(offeringId ?? ""),
    queryFn: () => gradingService.listDiscrepancies(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 15 * 1000,
  });
}

/** An edit after submitting re-runs comparison, so this is refetched rather than cached hard. */
export function useDiscrepancy(caseId: string | undefined) {
  return useQuery({
    queryKey: gradingKeys.discrepancy(caseId ?? ""),
    queryFn: () => gradingService.discrepancy(caseId as string),
    enabled: Boolean(caseId),
    staleTime: 0,
  });
}

export function useGrades(offeringId: string | undefined) {
  return useQuery({
    queryKey: gradingKeys.grades(offeringId ?? ""),
    queryFn: () => gradingService.listGrades(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 15 * 1000,
  });
}

/** Resolving writes a final grade and moves the project, so everything downstream refetches. */
export function useResolveDiscrepancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, payload }: { caseId: string; payload: ResolveDiscrepancyPayload }) =>
      gradingService.resolveDiscrepancy(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gradingKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useOverrideGrade(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: OverrideGradePayload }) =>
      gradingService.overrideGrade(projectId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gradingKeys.grades(offeringId) });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useCloseOffering(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gradingService.closeOffering(offeringId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: structureKeys.all });
    },
  });
}
