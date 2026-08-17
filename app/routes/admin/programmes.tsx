import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { ProgrammesPanel } from "~/features/structure/components/programmes-panel";
import { useUnitScope } from "~/features/structure/api/use-unit-scope";
import { UnitScopePicker } from "~/features/structure/components/unit-scope-picker";

export function meta() {
  return [{ title: "Programmes | GraderPlus" }];
}

export default function AdminProgrammesRoute() {
  const allowed = usePermission("programme.read");
  const scope = useUnitScope();

  return (
    <RequirePermission allowed={allowed} what="programmes">
      <div className="space-y-6">
        <PageHeader
          title="Programmes"
          description="Degree programmes, listed per academic unit. A module can serve several programmes, and a programme can draw on several modules."
        />

        {scope.isError ? (
          <ErrorCard
            title="Could not load academic units"
            error={scope.error}
            onRetry={() => void scope.refetch()}
            isRetrying={scope.isFetching}
          />
        ) : scope.isLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <>
            <UnitScopePicker
              value={scope.unitId}
              onChange={scope.setUnitId}
              ordered={scope.ordered}
            />
            {scope.unitId && <ProgrammesPanel unitId={scope.unitId} />}
          </>
        )}
      </div>
    </RequirePermission>
  );
}
