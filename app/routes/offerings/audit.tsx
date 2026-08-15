import { useParams } from "react-router";

import { useOfferingAudit } from "~/features/audit/api/use-audit";
import { AuditTable } from "~/features/audit/components/audit-table";
import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";

export function meta() {
  return [{ title: "Offering audit | GraderPlus" }];
}

export default function OfferingAuditRoute() {
  const { offeringId = "" } = useParams();
  const allowed = usePermission("audit.read_scoped");
  const { data, isPending, isError, error, refetch, isFetching } = useOfferingAudit(offeringId);

  return (
    <RequirePermission allowed={allowed} what="this offering's audit log">
      <AuditTable
        entries={data}
        isLoading={isPending}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
        emptyDescription="Nothing has happened on this offering that GraderPlus records yet."
      />
    </RequirePermission>
  );
}
