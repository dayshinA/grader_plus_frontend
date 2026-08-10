import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { RubricsPage } from "~/features/rubrics/components/rubrics-page";

export function meta() {
  return [{ title: "Rubrics — GraderPlus" }];
}

export default function Rubrics() {
  // Any-of: `rubrics.view` is what Department Admin and System Administrator hold (oversight),
  // `rubrics.create` what the module's own Coordinator holds on top. Gating on `create` alone —
  // as this route did until 2026-08-10 — locked every read-only holder out of a screen the
  // backend happily serves them.
  return (
    <PermissionGate permissions={["rubrics.view", "rubrics.create"]} title="Rubrics">
      <RubricsPage />
    </PermissionGate>
  );
}
