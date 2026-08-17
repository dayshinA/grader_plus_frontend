import { useState } from "react";

import { PageHeader } from "~/components/ui/page-header";
import { NotFoundPage } from "~/components/ui/not-found-page";
import { usePlatformAudit } from "~/features/audit/api/use-audit";
import { AuditTable } from "~/features/audit/components/audit-table";
import { AUDIT_HIDDEN } from "~/features/audit/visibility";
import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { FormField } from "~/components/ui/form-field";

export function meta() {
  return [{ title: "Audit log | GraderPlus" }];
}

export default function AdminAuditRoute() {
  // Hidden for now. The screen is intact and mounts again with the flag, and nothing is
  // requested while it does not.
  return AUDIT_HIDDEN ? <NotFoundPage /> : <AdminAuditScreen />;
}

function AdminAuditScreen() {
  const allowed = usePermission("audit.read");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");

  const { data, isPending, isError, error, refetch, isFetching } = usePlatformAudit({
    action: action.trim() || undefined,
    actor: actor.trim() || undefined,
    limit: 200,
  });

  return (
    <RequirePermission allowed={allowed} what="the platform audit log">
      <div className="space-y-6">
        <PageHeader
          title="Audit log"
          description="Every recorded action, newest first. Entries can never be edited or deleted."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Action"
            name="action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            hint="Matched against the recorded action, for example grade.override."
          />
          <FormField
            label="Actor user id"
            name="actor"
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            hint="The account that did it. Leave blank for everybody."
          />
        </div>

        <AuditTable
          entries={data}
          isLoading={isPending}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
          emptyDescription="Nothing matching has been recorded. The log fills as people use the platform."
        />
      </div>
    </RequirePermission>
  );
}
