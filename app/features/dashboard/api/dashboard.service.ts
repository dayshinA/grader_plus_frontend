import { api } from "~/lib/api-client";
import type { DashboardResponse } from "~/features/dashboard/types";

/** Raw DashboardModule endpoint call (Coordinator + Super Admin, Department Admin oversight
 * included via OwnerGuard) — read-only, no mutations in this module. */
export const dashboardService = {
  getDashboard: (moduleId: string): Promise<DashboardResponse> =>
    api.get<DashboardResponse>(`/academic-modules/${moduleId}/dashboard`),
};
