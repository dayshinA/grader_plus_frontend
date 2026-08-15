import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { usePermission } from "~/features/auth/api/auth-context";
import { RequirePermission } from "~/features/auth/components/protected-route";
import { ModulesPanel } from "~/features/structure/components/modules-panel";
import { useUnitScope } from "~/features/structure/api/use-unit-scope";
import { UnitScopePicker } from "~/features/structure/components/unit-scope-picker";

export function meta() {
  return [{ title: "Modules | GraderPlus" }];
}

export default function AdminModulesRoute() {
  const allowed = usePermission("module.read");
  const scope = useUnitScope();

  return (
    <RequirePermission allowed={allowed} what="project modules">
      <div className="space-y-6">
        <PageHeader
          title="Modules"
          description="Project modules, their offerings, and the programmes each one serves."
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
            {scope.unitId && <ModulesPanel unitId={scope.unitId} />}
          </>
        )}
      </div>
    </RequirePermission>
  );
}
