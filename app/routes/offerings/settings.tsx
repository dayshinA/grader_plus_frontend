import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { OfferingSettingsPage } from "~/features/structure/components/offering-settings-page";

export function meta() {
  return [{ title: "Offering settings | GraderPlus" }];
}

export default function OfferingSettingsRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("offering.read");

  return (
    <RequirePermission allowed={allowed} what="this offering">
      <OfferingSettingsPage offeringId={offeringId} />
    </RequirePermission>
  );
}
