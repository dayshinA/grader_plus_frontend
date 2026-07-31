import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Discrepancies — GraderPlus" }];
}

export default function Discrepancies() {
  return (
    <PermissionGate permissions={["discrepancies.view"]} title="Discrepancies" icon={ClipboardCheck}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Discrepancies" icon={ClipboardCheck} />
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </div>
    </PermissionGate>
  );
}
