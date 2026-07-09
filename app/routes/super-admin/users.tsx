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
  await queryClient.ensureQueryData({
    queryKey: usersQueryKey,
    queryFn: usersService.getUsers,
  });
  return null;
}

export default function SuperAdminUsers() {
  return <UsersPage />;
}
