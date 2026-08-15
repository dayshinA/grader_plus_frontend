import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { DiscrepancyDetailPage } from "~/features/grading/components/discrepancy-detail-page";

export function meta() {
  return [{ title: "Discrepancy | GraderPlus" }];
}

export default function DiscrepancyRoute() {
  const { caseId = "" } = useParams();
  // Reading a case detail requires the permission to settle it: this is the one screen
  // where both markers' work is visible, and it is coordinator only by design.
  const allowed = usePermission("discrepancy.resolve");

  return (
    <RequirePermission allowed={allowed} what="settling discrepancies">
      <DiscrepancyDetailPage caseId={caseId} />
    </RequirePermission>
  );
}
