import { useQuery } from "@tanstack/react-query";

import { dashboardService } from "~/features/dashboard/api/dashboard.service";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  home: () => [...dashboardKeys.all, "home"] as const,
  offering: (offeringId: string) => [...dashboardKeys.all, "offering", offeringId] as const,
  unit: (unitId: string) => [...dashboardKeys.all, "unit", unitId] as const,
  adminOverview: () => [...dashboardKeys.all, "admin-overview"] as const,
};

export function useHome() {
  return useQuery({
    queryKey: dashboardKeys.home(),
    queryFn: () => dashboardService.home(),
    staleTime: 60 * 1000,
  });
}

/**
 * Markers submit while a coordinator watches this, so it goes stale quickly. Refetching on
 * an interval is cheaper than a screen that quietly disagrees with what happened.
 */
export function useOfferingDashboard(offeringId: string) {
  return useQuery({
    queryKey: dashboardKeys.offering(offeringId),
    queryFn: () => dashboardService.offering(offeringId),
    enabled: Boolean(offeringId),
    staleTime: 15 * 1000,
  });
}

export function useUnitDashboard(unitId: string) {
  return useQuery({
    queryKey: dashboardKeys.unit(unitId),
    queryFn: () => dashboardService.unit(unitId),
    enabled: Boolean(unitId),
    staleTime: 30 * 1000,
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: dashboardKeys.adminOverview(),
    queryFn: () => dashboardService.adminOverview(),
    staleTime: 60 * 1000,
  });
}
