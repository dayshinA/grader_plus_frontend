import { ScrollText } from "lucide-react";

import { PageHeader } from "~/components/ui/page-header";
import { PagePlaceholder } from "~/components/ui/page-placeholder";
import { findNavItem } from "~/features/dashboard/nav";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Rubrics — GraderPlus" }];
}

const nav = findNavItem("/workspace/rubrics");

export default function Rubrics() {
  return (
    <PermissionGate
      permissions={["rubrics.create"]}
      title="Rubrics"
      description={nav?.description}
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Rubrics" description={nav?.description} />
        <PagePlaceholder
          icon={ScrollText}
          title="Not built yet"
          description="A module's rubric — the criteria every marker scores against, and what each one is worth."
          planned={[
            "Create a rubric for a module, with weighted criteria",
            "Edit criteria and weights before marking opens",
            "Copy a rubric from a previous run of the module",
          ]}
        />
      </div>
    </PermissionGate>
  );
}
