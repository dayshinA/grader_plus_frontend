import { ensureAuthenticated } from "~/features/auth/utils";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import { ModuleCreationGrantsPage } from "~/features/module-creation-grants/components/module-creation-grants-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Module Creation Grants — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard reload
  // this loader can fire before AuthProvider has mounted, so a silent-
  // session-recovery attempt has to happen here too, not just in
  // AuthProvider's own mount effect.
  if (!(await ensureAuthenticated())) return null;
  // prefetchQuery, not ensureQueryData: under the RBAC model a list endpoint
  // 403s for a caller who lacks the permission (rather than returning an empty
  // 200), and a clientLoader runs *before* the component — so ensureQueryData's
  // throw escaped PermissionGate entirely and rendered the raw ErrorBoundary.
  // prefetchQuery is TanStack's documented graceful-degradation path: it never
  // throws, so the prefetch stays a head start and the component decides what
  // to show. Its own useQuery re-runs and surfaces any genuine error.
  // See BUGS.md 2026-07-31.
  // Both lists are needed immediately for the department/coordinator pickers.
  // The grants list itself isn't prefetched here — it's department-selection-
  // dependent, and no department is selected on first load.
  await Promise.all([
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

export default function SuperAdminModuleGrants() {
  return <ModuleCreationGrantsPage />;
}
