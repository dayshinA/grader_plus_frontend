import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Callout } from "~/components/ui/callout";
import { ErrorCard } from "~/components/ui/error-card";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { useAdminOverview } from "~/features/dashboard/api/use-dashboard";
import { formatNumber } from "~/utils/format";

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Counts of what the platform holds, for the person who runs it. Not academic data: no mark
 * appears here, and the query behind it never fetches one.
 */
export function AdminOverviewPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description="What GraderPlus currently holds. Counts and health, and no marks anywhere on this screen."
      />

      {isError ? (
        <ErrorCard
          title="Could not load the overview"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Accounts</CardTitle>
                <CardDescription>Staff only. Students never hold an account.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <Figure label="Total" value={data.accounts.total} />
                <Figure label="Active" value={data.accounts.active} />
                <Figure label="Live grants" value={data.accounts.activeRoleGrants} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Structure</CardTitle>
                <CardDescription>Two levels of unit, then programmes and modules.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Figure label="Schools" value={data.structure.schools} />
                <Figure label="Constituent units" value={data.structure.constituentUnits} />
                <Figure label="Programmes" value={data.structure.programmes} />
                <Figure label="Modules" value={data.structure.modules} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Work</CardTitle>
                <CardDescription>Offerings, projects and anything unsettled.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Figure label="Offerings" value={data.work.offerings} />
                <Figure label="Still open" value={data.work.openOfferings} />
                <Figure label="Projects" value={data.work.projects} />
                <Figure label="Graded" value={data.work.gradedProjects} />
                <Figure label="Open cases" value={data.work.openDiscrepancies} />
              </CardContent>
            </Card>
          </div>

          {data.work.openDiscrepancies > 0 && (
            <Callout variant="warning" title="Open discrepancy cases">
              {data.work.openDiscrepancies} case
              {data.work.openDiscrepancies === 1 ? " is" : "s are"} waiting on a coordinator.
              Only the coordinator of an offering can settle one, so this figure is a prompt to
              chase rather than something to act on from here.
            </Callout>
          )}
        </>
      )}
    </div>
  );
}
