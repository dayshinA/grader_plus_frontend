import { ClipboardCheck } from "lucide-react";

import { PageHeader } from "~/components/ui/page-header";
import { PagePlaceholder } from "~/components/ui/page-placeholder";
import { findNavItem } from "~/features/dashboard/nav";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Discrepancies — GraderPlus" }];
}

const nav = findNavItem("/workspace/discrepancies");

export default function Discrepancies() {
  return (
    <PermissionGate
      permissions={["discrepancies.view"]}
      title="Discrepancies"
      description={nav?.description}
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Discrepancies" description={nav?.description} />
        <PagePlaceholder
          icon={ClipboardCheck}
          title="Not built yet"
          description="Projects where the markers' scores are further apart than the module allows, and what was done about each."
          planned={[
            "Every project over the module's discrepancy threshold",
            "The scores side by side, once blind marking has closed",
            "Record the agreed resolution and write it to the final grade",
          ]}
        />
      </div>
    </PermissionGate>
  );
}
