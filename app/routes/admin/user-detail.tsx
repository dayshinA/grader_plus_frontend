import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { UserDetailPage } from "~/features/users/components/user-detail-page";

export function meta() {
  return [{ title: "Account | GraderPlus" }];
}

export default function AdminUserDetailRoute() {
  const { userId = "" } = useParams();
  const allowed = usePermission("user.read");

  return (
    <RequirePermission allowed={allowed} what="staff accounts">
      <UserDetailPage userId={userId} />
    </RequirePermission>
  );
}
