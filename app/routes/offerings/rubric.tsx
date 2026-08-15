import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { RubricPage } from "~/features/rubrics/components/rubric-page";

export function meta() {
  return [{ title: "Rubric | GraderPlus" }];
}

export default function OfferingRubricRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("rubric.read");

  return (
    <RequirePermission allowed={allowed} what="this offering's rubric">
      <RubricPage offeringId={offeringId} />
    </RequirePermission>
  );
}
