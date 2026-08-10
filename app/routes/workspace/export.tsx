import { FileSpreadsheet } from "lucide-react";

import { PageHeader } from "~/components/ui/page-header";
import { PagePlaceholder } from "~/components/ui/page-placeholder";
import { findNavItem } from "~/features/dashboard/nav";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Export — GraderPlus" }];
}

const nav = findNavItem("/workspace/export");

export default function Export() {
  return (
    <PermissionGate
      permissions={["grades.export"]}
      title="Export"
      description={nav?.description}
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Export" description={nav?.description} />
        <PagePlaceholder
          icon={FileSpreadsheet}
          title="Not built yet"
          description="Final grades, in the format Learn accepts on the way back in. Read from final grades only, never from individual evaluations."
          planned={[
            "Export a module's final grades as a Learn-ready file",
            "See which students are still missing a final grade",
            "A record of what was exported, and when",
          ]}
        />
      </div>
    </PermissionGate>
  );
}
