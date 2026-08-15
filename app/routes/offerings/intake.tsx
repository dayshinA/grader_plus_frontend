import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { IntakePage } from "~/features/intake/components/intake-page";

export function meta() {
  return [{ title: "Intake | GraderPlus" }];
}

export default function OfferingIntakeRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("project.read");

  return (
    <RequirePermission allowed={allowed} what="this offering's projects">
      <IntakePage offeringId={offeringId} />
    </RequirePermission>
  );
}
