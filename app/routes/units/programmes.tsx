import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { ProgrammesPanel } from "~/features/structure/components/programmes-panel";

export function meta() {
  return [{ title: "Unit programmes | GraderPlus" }];
}

export default function UnitProgrammesRoute() {
  const { unitId = "" } = useParams();
  const allowed = usePermission("programme.read");

  return (
    <RequirePermission allowed={allowed} what="this unit's programmes">
      <ProgrammesPanel unitId={unitId} />
    </RequirePermission>
  );
}
