import { ListChecks } from "lucide-react";

import { PageHeader } from "~/components/ui/page-header";
import { PagePlaceholder } from "~/components/ui/page-placeholder";
import { findNavItem } from "~/features/dashboard/nav";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Marker Assignments — GraderPlus" }];
}

const nav = findNavItem("/workspace/marker-assignments");

export default function MarkerAssignments() {
  return (
    <PermissionGate
      permissions={["markers.assign"]}
      title="Marker Assignments"
      description={nav?.description}
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Marker Assignments" description={nav?.description} />
        <PagePlaceholder
          icon={ListChecks}
          title="Not built yet"
          description="Who marks what. A project takes up to five markers, and a moderator is simply one of them."
          planned={[
            "Assign and unassign markers per project",
            "See at a glance which projects are short of markers",
            "Flag one assignment as the moderator, graded blind like the rest",
          ]}
        />
      </div>
    </PermissionGate>
  );
}
