import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Export — GraderPlus" }];
}

export default function Export() {
  return (
    <PermissionGate permissions={["grades.export"]} title="Export" icon={FileSpreadsheet}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Export" icon={FileSpreadsheet} />
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </div>
    </PermissionGate>
  );
}
