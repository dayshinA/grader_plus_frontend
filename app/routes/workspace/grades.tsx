import { GradesPage } from "~/features/export/components/grades-page";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Grades — GraderPlus" }];
}

export default function Grades() {
  // Replaced `/workspace/export` on 2026-08-10. `grades.view` (JSON, in-app) and `grades.export`
  // (Learn-format CSV) are two surfaces over the same `final_grades` data, so they're one screen
  // with the download gated inside it rather than two screens nobody sees both of. The download
  // itself isn't built yet — see GradesPage.
  return (
    <PermissionGate permissions={["grades.view", "grades.export"]} title="Grades">
      <GradesPage />
    </PermissionGate>
  );
}
