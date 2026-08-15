import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { AdminOverviewPage } from "~/features/dashboard/components/admin-overview-page";

export function meta() {
  return [{ title: "Platform overview | GraderPlus" }];
}

export default function AdminOverviewRoute() {
  const allowed = usePermission("platform.read");
  return (
    <RequirePermission allowed={allowed} what="the platform overview">
      <AdminOverviewPage />
    </RequirePermission>
  );
}
