import { DiscrepanciesPage } from "~/features/discrepancy/components/discrepancies-page";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Discrepancies — GraderPlus" }];
}

export default function Discrepancies() {
  // `discrepancies.resolve` is deliberately not accepted here: it's a strictly narrower set
  // (the module's own Coordinator), and everyone holding it also holds `discrepancies.view`.
  return (
    <PermissionGate permissions={["discrepancies.view"]} title="Discrepancies">
      <DiscrepanciesPage />
    </PermissionGate>
  );
}
