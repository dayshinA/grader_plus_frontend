import { api } from "~/lib/api-client";
import type {
  AdminOverview,
  HomeSummary,
  OfferingDashboard,
  UnitDashboard,
} from "~/features/dashboard/types";

// No query here fetches a score column, so there is nothing to accidentally render.
export const dashboardService = {
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
