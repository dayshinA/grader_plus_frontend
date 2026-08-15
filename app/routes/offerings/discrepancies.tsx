import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { DiscrepanciesPage } from "~/features/grading/components/discrepancies-page";

export function meta() {
  return [{ title: "Discrepancies | GraderPlus" }];
}

export default function OfferingDiscrepanciesRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("discrepancy.read");

  return (
    <RequirePermission allowed={allowed} what="this offering's discrepancies">
      <DiscrepanciesPage offeringId={offeringId} />
    </RequirePermission>
  );
}
