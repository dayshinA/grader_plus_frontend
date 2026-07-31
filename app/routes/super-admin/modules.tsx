import { GraduationCap } from "lucide-react";
import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { academicModulesQueryKey } from "~/features/academic-modules/api/use-academic-modules";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";
import { ModulesPage } from "~/features/academic-modules/components/modules-page";
import { ensureAuthenticated } from "~/features/auth/utils";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Modules — GraderPlus" }];
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
  // All three are needed immediately: the module list itself, plus departments/users for the
  // Department/Coordinator table columns and the create/edit dialog's pickers (Super Admin can
  // call both GET /departments and GET /users, unlike a Coordinator viewer of this same page).
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: academicModulesQueryKey,
      queryFn: academicModulesService.getModules,
    }),
    queryClient.prefetchQuery({
      queryKey: departmentsQueryKey,
      queryFn: departmentsService.getDepartments,
    }),
    queryClient.prefetchQuery({
      queryKey: usersQueryKey,
      queryFn: usersService.getUsers,
    }),
  ]);
  return null;
}

export default function SuperAdminModules() {
  return (
    <PermissionGate permissions={["modules.create"]} title="Modules" icon={GraduationCap}>
      <ModulesPage viewer="super_admin" />
    </PermissionGate>
  );
}
