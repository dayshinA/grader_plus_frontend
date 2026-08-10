import { PermissionGate } from "~/features/permissions/components/permission-gate";
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
  // prefetchQuery, not ensureQueryData: under the RBAC model a list endpoint
  // 403s for a caller who lacks the permission (rather than returning an empty
  // 200), and a clientLoader runs *before* the component — so ensureQueryData's
  // throw escaped PermissionGate entirely and rendered the raw ErrorBoundary.
  // prefetchQuery is TanStack's documented graceful-degradation path: it never
  // throws, so the prefetch stays a head start and the component decides what
  // to show. Its own useQuery re-runs and surfaces any genuine error.
  // See BUGS.md 2026-07-31.
  // Only the module list is prefetchable here — the dashboard query itself is keyed by
  // moduleId, which isn't resolved until DashboardPage picks/defaults it from the URL param.
  await queryClient.prefetchQuery({
    queryKey: academicModulesQueryKey,
    queryFn: academicModulesService.getModules,
  });
  return null;
}

export default function CoordinatorDashboard() {
  return (
    <PermissionGate permissions={["dashboard.view"]} title="Dashboard">
      <DashboardPage />
    </PermissionGate>
  );
}
