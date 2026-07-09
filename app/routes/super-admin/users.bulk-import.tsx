import { BulkImportPage } from "~/features/users/components/bulk-import-page";

export function meta() {
  return [{ title: "Bulk import users — GraderPlus" }];
}

export default function SuperAdminUsersBulkImport() {
  return <BulkImportPage />;
}
