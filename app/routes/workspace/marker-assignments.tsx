import { findNavItem } from "~/features/dashboard/nav";
import { MarkerAssignmentsPage } from "~/features/marker-assignments/components/marker-assignments-page";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Marker Assignments — GraderPlus" }];
}

const nav = findNavItem("/workspace/marker-assignments");

/**
 * `markers.assign` is held only by a module-scoped Project Coordinator — no admin tier holds it at
 * any scope, so this gate has a single genuine audience, unlike most `/workspace/*` screens.
 */
export default function MarkerAssignments() {
  return (
    <PermissionGate
      permissions={["markers.assign"]}
      title="Marker Assignments"
      description={nav?.description}
    >
      <MarkerAssignmentsPage />
    </PermissionGate>
  );
}
