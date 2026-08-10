import { SubmissionsPage } from "~/features/submissions/components/submissions-page";
import { findNavItem } from "~/features/dashboard/nav";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Submissions — GraderPlus" }];
}

const nav = findNavItem("/workspace/submissions");

/**
 * Gated on `submissions.upload` — the module Coordinator's key — rather than the
 * more natural-looking `submissions.view`.
 *
 * `submissions.view` is held by Department Admin, School Admin and System Administrator too, but
 * `SubmissionAccessGuard` reads `module.coordinatorId` directly and does not cascade to the admin
 * tiers (`API_ACCESS_REFERENCE.txt` Parts 1.5 and 7), so every one of them would reach this screen
 * and then be refused the files themselves. Gating on the upload key keeps the screen with the
 * only role that can actually use it.
 */
export default function Submissions() {
  return (
    <PermissionGate
      permissions={["submissions.upload"]}
      title="Submissions"
      description={nav?.description}
    >
      <SubmissionsPage />
    </PermissionGate>
  );
}
