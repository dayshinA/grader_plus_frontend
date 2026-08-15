import { useParams } from "react-router";

import { NotFoundPage } from "~/components/ui/not-found-page";
import { useUnitAudit } from "~/features/audit/api/use-audit";
import { AuditTable } from "~/features/audit/components/audit-table";
import { AUDIT_HIDDEN } from "~/features/audit/visibility";
import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";

export function meta() {
  return [{ title: "Unit audit | GraderPlus" }];
}

export default function UnitAuditRoute() {
  // Hidden for now. The screen is intact and mounts again with the flag, and nothing is
  // requested while it does not.
  return AUDIT_HIDDEN ? <NotFoundPage /> : <UnitAuditScreen />;
}

function UnitAuditScreen() {
  const { unitId = "" } = useParams();
  const allowed = usePermission("audit.read_scoped");
  const { data, isPending, isError, error, refetch, isFetching } = useUnitAudit(unitId);

  return (
    <RequirePermission allowed={allowed} what="this unit's audit log">
      <AuditTable
        entries={data}
        isLoading={isPending}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
        emptyDescription="Nothing has happened inside this unit that GraderPlus records yet."
      />
    </RequirePermission>
  );
}
