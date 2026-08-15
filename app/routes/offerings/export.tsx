import { useParams } from "react-router";

import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { ExportPage } from "~/features/export/components/export-page";

export function meta() {
  return [{ title: "Export | GraderPlus" }];
}

export default function OfferingExportRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("export.run");

  return (
    <RequirePermission allowed={allowed} what="exporting from this offering">
      <ExportPage offeringId={offeringId} />
    </RequirePermission>
  );
}
