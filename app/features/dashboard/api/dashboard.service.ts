import { api } from "~/lib/api-client";
import type {
  AdminOverview,
  HomeSummary,
  OfferingDashboard,
  UnitDashboard,
} from "~/features/dashboard/types";

/**
 * Read only aggregates. No query behind any of these fetches a score column, so there is
 * nothing on these screens to accidentally render, and nothing to enrich them with either.
 */
export const dashboardService = {
  /** Already shaped for the caller. The screen renders what it is given. */
  home(): Promise<HomeSummary> {
    return api.get<HomeSummary>("/me/home");
  },

  /** Per project, per marker: a state and a timestamp. Never a total. */
  offering(offeringId: string): Promise<OfferingDashboard> {
    return api.get<OfferingDashboard>(`/offerings/${offeringId}/dashboard`);
  },

  unit(unitId: string): Promise<UnitDashboard> {
    return api.get<UnitDashboard>(`/units/${unitId}/dashboard`);
  },

  adminOverview(): Promise<AdminOverview> {
    return api.get<AdminOverview>("/admin/overview");
  },
};
