import { RequirePermission } from "~/features/auth/components/protected-route";
import { usePermission } from "~/features/auth/api/auth-context";
import { UnitsPage } from "~/features/structure/components/units-page";

export function meta() {
  return [{ title: "Academic units | GraderPlus" }];
}

export default function AdminUnitsRoute() {
  const allowed = usePermission("unit.read");
  return (
    <RequirePermission allowed={allowed} what="the academic unit structure">
      <UnitsPage />
    </RequirePermission>
  );
}
