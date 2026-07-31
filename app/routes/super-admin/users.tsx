import { Users } from "lucide-react";
import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { ensureAuthenticated } from "~/features/auth/utils";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import { UsersPage } from "~/features/users/components/users-page";
import { queryClient } from "~/lib/query-client";

export function meta() {
  return [{ title: "Users — GraderPlus" }];
}

export async function clientLoader() {
  // Must run first — see ensureAuthenticated's own comment. On a hard
  // reload this loader can fire before AuthProvider has mounted, so a
  // silent-session-recovery attempt has to happen here too, not just in
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
  await queryClient.prefetchQuery({
    queryKey: usersQueryKey,
    queryFn: usersService.getUsers,
  });
  return null;
}

export default function SuperAdminUsers() {
  return (
    <PermissionGate permissions={["users.view"]} title="Users" icon={Users}>
      <UsersPage />
    </PermissionGate>
  );
}
