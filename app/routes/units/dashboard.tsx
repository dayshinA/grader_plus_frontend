import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { UnitDashboardPage } from "~/features/dashboard/components/unit-dashboard-page";

export function meta() {
  return [{ title: "Unit progress | GraderPlus" }];
}

export default function UnitDashboardRoute() {
  const { unitId = "" } = useParams();
  const allowed = usePermission("dashboard.read");

  return (
    <RequirePermission allowed={allowed} what="this unit's marking progress">
      <UnitDashboardPage unitId={unitId} />
    </RequirePermission>
  );
}
