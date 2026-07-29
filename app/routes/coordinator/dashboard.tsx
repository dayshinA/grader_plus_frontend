import { academicModulesQueryKey } from "~/features/academic-modules/api/use-academic-modules";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";
import { ensureAuthenticated } from "~/features/auth/utils";
import { DashboardPage } from "~/features/dashboard/components/dashboard-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Dashboard — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard reload this loader can
  // fire before AuthProvider has mounted, so a silent-session-recovery attempt has to happen
  // here too, not just in AuthProvider's own mount effect.
  if (!(await ensureAuthenticated())) return null;
  // Only the module list is prefetchable here — the dashboard query itself is keyed by
  // moduleId, which isn't resolved until DashboardPage picks/defaults it from the URL param.
  await queryClient.ensureQueryData({
    queryKey: academicModulesQueryKey,
    queryFn: academicModulesService.getModules,
  });
  return null;
}

export default function CoordinatorDashboard() {
  return <DashboardPage />;
}
