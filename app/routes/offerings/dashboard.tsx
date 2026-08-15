import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { OfferingDashboardPage } from "~/features/dashboard/components/offering-dashboard-page";

export function meta() {
  return [{ title: "Marking progress | GraderPlus" }];
}

export default function OfferingDashboardRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("dashboard.read");

  return (
    <RequirePermission allowed={allowed} what="this offering's marking progress">
      <OfferingDashboardPage offeringId={offeringId} />
    </RequirePermission>
  );
}
