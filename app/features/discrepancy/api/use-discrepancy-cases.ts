import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { discrepancyService } from "~/features/discrepancy/api/discrepancy.service";

export const discrepancyCasesQueryKey = (moduleId: string) =>
  ["discrepancy-cases", moduleId] as const;

/**
 * A student's flagged outcome can change with no coordinator action at all — a marker editing a
 * score after going final re-runs the comparison, right up until the case is resolved. So this
 * deliberately takes no `staleTime`: the query client's default (always stale, refetch on mount)
 * is the right behaviour here, and adding caching would show a case that has since moved.
 */
export function useDiscrepancyCases(moduleId: string | undefined) {
  return useQuery({
    queryKey: discrepancyCasesQueryKey(moduleId ?? ""),
    queryFn: () => discrepancyService.getCases(moduleId as string),
    enabled: Boolean(moduleId),
  });
}

/**
 * Records an agreed mark on one case.
 *
 * Invalidates the module's grades alongside its cases: resolving writes a `final_grades` row, so
 * the Grades screen is stale the instant this succeeds — and a coordinator resolving a case is
 * very often on their way there next.
 */
export function useResolveDiscrepancy(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, agreedMark }: { caseId: string; agreedMark: number }) =>
      discrepancyService.resolveCase(moduleId, caseId, agreedMark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discrepancyCasesQueryKey(moduleId) });
      queryClient.invalidateQueries({ queryKey: ["grades", moduleId] });
    },
  });
}
