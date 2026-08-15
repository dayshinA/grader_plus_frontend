import { useParams } from "react-router";

import { AssignmentsPage } from "~/features/assignments/components/assignments-page";
import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";

export function meta() {
  return [{ title: "Assignments | GraderPlus" }];
}

export default function OfferingAssignmentsRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("assignment.read");

  return (
    <RequirePermission allowed={allowed} what="this offering's allocation">
      <AssignmentsPage offeringId={offeringId} />
    </RequirePermission>
  );
}
