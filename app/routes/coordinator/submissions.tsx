import { Upload } from "lucide-react";
import { PageHeader } from "~/components/ui/page-header";
import { PermissionGate } from "~/features/permissions/components/permission-gate";

export function meta() {
  return [{ title: "Submissions — GraderPlus" }];
}

export default function CoordinatorSubmissions() {
  return (
    <PermissionGate permissions={["submissions.upload"]} title="Submissions" icon={Upload}>
      <div className="flex flex-col gap-4">
        <PageHeader title="Submissions" icon={Upload} />
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </div>
    </PermissionGate>
  );
}
