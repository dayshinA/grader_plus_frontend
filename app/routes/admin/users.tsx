import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { UsersPage } from "~/features/users/components/users-page";

export function meta() {
  return [{ title: "Accounts | GraderPlus" }];
}

export default function AdminUsersRoute() {
  const allowed = usePermission("user.read");
  return (
    <RequirePermission allowed={allowed} what="staff accounts">
      <UsersPage />
    </RequirePermission>
  );
}
