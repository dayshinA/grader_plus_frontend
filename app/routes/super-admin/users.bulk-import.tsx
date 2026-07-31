import { Upload } from "lucide-react";
import { PermissionGate } from "~/features/permissions/components/permission-gate";
import { BulkImportPage } from "~/features/users/components/bulk-import-page";

export function meta() {
  return [{ title: "Bulk import users — GraderPlus" }];
}

export default function SuperAdminUsersBulkImport() {
  return (
    <PermissionGate permissions={["users.bulk_import"]} title="Bulk Import" icon={Upload}>
      <BulkImportPage />
    </PermissionGate>
  );
}
