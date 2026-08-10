import { useQuery } from "@tanstack/react-query";

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
