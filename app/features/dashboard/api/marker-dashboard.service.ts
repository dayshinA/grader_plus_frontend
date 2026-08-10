import type { MarkerDashboardItem } from "~/features/dashboard/types";
import { api } from "~/lib/api-client";

/**
 * `GET /markers/me/dashboard` — the Marker's own list of everything they have left to mark.
 *
 * Its own service file rather than a method on `dashboardService`, mirroring the backend's own
 * split (`MarkerDashboardController` is a separate controller from `DashboardController`, kept
 * apart so a module-scoped Marker assignment can never leak another marker's status). The two
 * answer different questions and are gated on different keys — `dashboard.view_own` here, which
 * is scope-blind and always self-filtered, vs `dashboard.view`'s module-wide containment check.
 *
 * Deliberately **not** nested under a module: it is cross-module by design, so there is no
 * `moduleId` argument and no module picker on the screen that consumes it.
 */
export const markerDashboardService = {
  getMyDashboard: (): Promise<MarkerDashboardItem[]> =>
    api.get<MarkerDashboardItem[]>("/markers/me/dashboard"),
};
