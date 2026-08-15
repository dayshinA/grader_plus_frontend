import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rubricsService } from "~/features/rubrics/api/rubrics.service";
import type { PutRubricPayload } from "~/features/rubrics/types";
import { isNotFound } from "~/lib/api-client";

export const rubricKeys = {
  all: ["rubrics"] as const,
  rubric: (offeringId: string) => [...rubricKeys.all, offeringId] as const,
  validation: (offeringId: string) => [...rubricKeys.all, offeringId, "validate"] as const,
};

/**
 * A 404 here is a state rather than a failure: an offering in setup has no rubric yet. The
 * screen reads `isMissing` and shows an empty editor instead of an error.
 */
export function useRubric(offeringId: string | undefined) {
  const query = useQuery({
    queryKey: rubricKeys.rubric(offeringId ?? ""),
    queryFn: () => rubricsService.get(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 60 * 1000,
  });

  return { ...query, isMissing: isNotFound(query.error) };
}

export function useRubricValidation(offeringId: string | undefined) {
  return useQuery({
    queryKey: rubricKeys.validation(offeringId ?? ""),
    queryFn: () => rubricsService.validate(offeringId as string),
    enabled: Boolean(offeringId),
    staleTime: 30 * 1000,
  });
}

export function useSaveRubric(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PutRubricPayload) => rubricsService.put(offeringId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rubricKeys.all });
    },
  });
}

export function useCopyRubric(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceOfferingId: string) =>
      rubricsService.copyFrom(offeringId, sourceOfferingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rubricKeys.all });
    },
  });
}
