import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { GradesPage } from "~/features/grading/components/grades-page";

export function meta() {
  return [{ title: "Grades | GraderPlus" }];
}

export default function OfferingGradesRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("grade.read");

  return (
    <RequirePermission allowed={allowed} what="this offering's grades">
      <GradesPage offeringId={offeringId} />
    </RequirePermission>
  );
}
