import { useQuery } from "@tanstack/react-query";

import { markerDashboardService } from "~/features/dashboard/api/marker-dashboard.service";

export const markerDashboardQueryKey = ["marker-dashboard"] as const;

/**
 * The signed-in marker's own assignments, across every module.
 *
 * No `staleTime`: a row's `status` changes as the marker works, and the project workspace
 * invalidates this key whenever an evaluation is created or goes final, so the list is correct
 * the moment they navigate back to it.
 */
export function useMarkerDashboard() {
  return useQuery({
    queryKey: markerDashboardQueryKey,
    queryFn: () => markerDashboardService.getMyDashboard(),
  });
}
