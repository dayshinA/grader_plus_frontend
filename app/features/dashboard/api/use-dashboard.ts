import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "~/features/dashboard/api/dashboard.service";

export const dashboardQueryKey = (moduleId: string) => ["dashboard", moduleId] as const;

/** `enabled` is gated on a module actually being selected — same pattern as
 * `useDepartmentAdminGrants`. `DashboardPage` defaults `moduleId` to the caller's first
 * accessible module once `useAcademicModules()` resolves, so this is only ever `undefined`
 * on the very first render. */
export function useDashboard(moduleId: string | undefined) {
  return useQuery({
    queryKey: dashboardQueryKey(moduleId ?? ""),
    queryFn: () => dashboardService.getDashboard(moduleId as string),
    enabled: Boolean(moduleId),
  });
}
