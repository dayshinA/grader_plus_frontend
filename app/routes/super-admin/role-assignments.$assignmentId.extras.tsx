import { ensureAuthenticated } from "~/features/auth/utils";
import { permissionCatalogueQueryKey } from "~/features/permissions/api/use-permission-catalogue";
import { permissionsService } from "~/features/permissions/api/permissions.service";
import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { ManageExtrasPage } from "~/features/role-assignments/components/manage-extras-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Extra permissions — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard reload this loader can fire
  // before AuthProvider has mounted, so a silent-session-recovery attempt has to happen here too.
  if (!(await ensureAuthenticated())) return null;

  // prefetchQuery, not ensureQueryData — a 403 must reach the component (and its PermissionGate)
  // rather than escaping to the raw ErrorBoundary. Same reasoning as the parent route's loader;
  // see BUGS.md 2026-07-31.
  //
  // Only the catalogue is prefetched. The assignments list depends on ?userId= and the org lists
  // are fetched by useScopeOptions, which tolerates a 403 on any of them individually.
  await queryClient.prefetchQuery({
    queryKey: permissionCatalogueQueryKey(),
    queryFn: () => permissionsService.getPermissionCatalogue(),
  });
  return null;
}

export default function ManageAssignmentExtras() {
  return (
    <PermissionGate
      permissions={["permissions.assign", "permissions.revoke"]}
      title="Extra permissions"
      description="Permissions granted on top of a role's own defaults."
      message="Only accounts that can grant extra permissions have access to this screen."
    >
      <ManageExtrasPage />
    </PermissionGate>
  );
}
