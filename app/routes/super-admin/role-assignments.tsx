import { ensureAuthenticated } from "~/features/auth/utils";
import { permissionCatalogueQueryKey } from "~/features/permissions/api/use-permission-catalogue";
import { roleTemplatesQueryKey } from "~/features/permissions/api/use-role-templates";
import { permissionsService } from "~/features/permissions/api/permissions.service";
import { RoleAssignmentsPage } from "~/features/role-assignments/components/role-assignments-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Role Assignments — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard reload
  // this loader can fire before AuthProvider has mounted, so a silent-
  // session-recovery attempt has to happen here too.
  if (!(await ensureAuthenticated())) return null;

  // prefetchQuery, not ensureQueryData: under the RBAC model a list endpoint
  // 403s for a caller who lacks the permission rather than returning an empty
  // 200, and a clientLoader runs *before* the component — so ensureQueryData's
  // throw escaped PermissionGate entirely and rendered the raw ErrorBoundary.
  // See BUGS.md 2026-07-31.
  //
  // Only the two catalogue calls are prefetched. The org lists are fetched by
  // useScopeOptions, which has to tolerate a 403 on any of them individually;
  // the assignments list is user-selection-dependent and nobody is selected on
  // first load unless ?userId= is present, which the component handles.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: roleTemplatesQueryKey,
      queryFn: permissionsService.getRoleTemplates,
    }),
    queryClient.prefetchQuery({
      queryKey: permissionCatalogueQueryKey(),
      queryFn: () => permissionsService.getPermissionCatalogue(),
    }),
  ]);
  return null;
}

export default function SuperAdminRoleAssignments() {
  return <RoleAssignmentsPage />;
}
