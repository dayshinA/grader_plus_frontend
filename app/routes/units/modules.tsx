import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { ModulesPanel } from "~/features/structure/components/modules-panel";

export function meta() {
  return [{ title: "Unit modules | GraderPlus" }];
}

export default function UnitModulesRoute() {
  const { unitId = "" } = useParams();
  const allowed = usePermission("module.read");

  return (
    <RequirePermission allowed={allowed} what="this unit's modules">
      <ModulesPanel unitId={unitId} />
    </RequirePermission>
  );
}
