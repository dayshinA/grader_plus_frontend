import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { academicModulesQueryKey } from "~/features/academic-modules/api/use-academic-modules";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";
import { ModuleSettingsPage } from "~/features/academic-modules/components/module-settings-page";
import { ensureAuthenticated } from "~/features/auth/utils";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Module Settings — GraderPlus" }];
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
  // GET /departments now self-filters by role (2026-07-11 backend fix, SYSTEM_DESIGN.md decision
  // #33) — a Coordinator gets back only the departments they administer or hold a creation grant
  // in, each with an `isAdmin` flag. Prefetched here for both the create-module department
  // picker AND `ModuleSettingsPage`'s decision of whether to show the FR40 Delegate Permissions
  // tab at all (decision #34) — an `isAdmin: true` row is what unlocks it.
  // No users prefetch needed — GET /users is still Super-Admin-only.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: academicModulesQueryKey,
      queryFn: academicModulesService.getModules,
    }),
    queryClient.prefetchQuery({
      queryKey: departmentsQueryKey,
      queryFn: departmentsService.getDepartments,
    }),
  ]);
  return null;
}

// Gated on the three module *write* permissions, matching this entry's nav rule (nav.ts's
// `excludes` pair, 2026-08-10). Was `["modules.view", "modules.create"]`, which let a read-only
// viewer — System Administrator, and School Admin since the 2026-08-03 backend redesign — reach
// the management URL and get the oversight screen under the wrong title. They have
// `/super-admin/modules` for that. `modules.create` alone stays sufficient here: it's all a
// department-scoped Coordinator holds (CH-17).
export default function CoordinatorModuleSettings() {
  return (
    <PermissionGate
      permissions={["modules.create", "modules.update", "modules.deactivate"]}
      title="Module Settings"
    >
      <ModuleSettingsPage />
    </PermissionGate>
  );
}
