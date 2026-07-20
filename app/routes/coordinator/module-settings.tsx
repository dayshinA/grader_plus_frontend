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
  // GET /departments now self-filters by role (2026-07-11 backend fix, SYSTEM_DESIGN.md decision
  // #33) — a Coordinator gets back only the departments they administer or hold a creation grant
  // in, each with an `isAdmin` flag. Prefetched here for both the create-module department
  // picker AND `ModuleSettingsPage`'s decision of whether to show the FR40 Delegate Permissions
  // tab at all (decision #34) — an `isAdmin: true` row is what unlocks it.
  // No users prefetch needed — GET /users is still Super-Admin-only.
  await Promise.all([
    queryClient.ensureQueryData({
      queryKey: academicModulesQueryKey,
      queryFn: academicModulesService.getModules,
    }),
    queryClient.ensureQueryData({
      queryKey: departmentsQueryKey,
      queryFn: departmentsService.getDepartments,
    }),
  ]);
  return null;
}

export default function CoordinatorModuleSettings() {
  return <ModuleSettingsPage />;
}
