import { useQueries, useQuery } from "@tanstack/react-query";

import { dashboardService } from "~/features/dashboard/api/dashboard.service";
import type { OfferingDashboard, UnitDashboard } from "~/features/dashboard/types";

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

/** Markers submit while a coordinator watches this, so it refetches on an interval. */
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

export function useAdminOverview(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.adminOverview(),
    queryFn: () => dashboardService.adminOverview(),
    staleTime: 60 * 1000,
    enabled,
  });
}

// Same query keys as the full dashboards, so clicking through is warm. Maps, so one card can fail.
export function useOfferingSnapshots(offeringIds: string[]) {
  return useQueries({
    queries: offeringIds.map((offeringId) => ({
      queryKey: dashboardKeys.offering(offeringId),
      queryFn: () => dashboardService.offering(offeringId),
      staleTime: 15 * 1000,
    })),
    combine: (results) => {
      const byId = new Map<string, OfferingDashboard>();
      results.forEach((result, index) => {
        if (result.data) byId.set(offeringIds[index], result.data);
      });
      return { byId, isLoading: results.some((result) => result.isLoading) };
    },
  });
}

export function useUnitSnapshots(unitIds: string[]) {
  return useQueries({
    queries: unitIds.map((unitId) => ({
      queryKey: dashboardKeys.unit(unitId),
      queryFn: () => dashboardService.unit(unitId),
      staleTime: 30 * 1000,
    })),
    combine: (results) => {
      const byId = new Map<string, UnitDashboard>();
      results.forEach((result, index) => {
        if (result.data) byId.set(unitIds[index], result.data);
      });
      return { byId, isLoading: results.some((result) => result.isLoading) };
    },
  });
}
