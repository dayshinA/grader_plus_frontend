import { Link } from "react-router";
import { Building2 } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { Skeleton } from "~/components/ui/skeleton";
import { useUnitDashboard } from "~/features/dashboard/api/use-dashboard";
import type { UnitDashboard } from "~/features/dashboard/types";
import { OfferingStatusBadge } from "~/features/structure/components/offering-status-badge";
import type { OfferingStatus } from "~/features/structure/types";
import { formatDate } from "~/utils/format";

type OfferingRow = UnitDashboard["offerings"][number];

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CompletionBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${percent} percent graded`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
    </div>
  );
}

/**
 * Progress across the offerings beneath one unit. It says that a case exists and how far
 * marking has got. It does not show individual scores, and there is no route here that
 * would let it.
 */
export function UnitDashboardPage({ unitId }: { unitId: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useUnitDashboard(unitId);

  if (isError) {
    return (
      <ErrorCard
        title="Could not load this unit"
        error={error}
        description="A refusal here means your account holds no role covering this unit."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const columns: DataTableColumn<OfferingRow>[] = [
    {
      id: "offering",
      header: "Offering",
      cell: (row) => (
        <div className="min-w-0">
          <Link
            to={`/offerings/${row.offeringId}`}
            className="block truncate font-medium underline-offset-4 hover:underline"
          >
            {row.moduleCode} {row.academicYear}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{row.moduleTitle}</p>
        </div>
      ),
      skeletonClassName: "w-44",
    },
    {
      id: "unit",
      header: "Unit",
      cell: (row) => <span className="text-muted-foreground">{row.unitName}</span>,
      className: "hidden lg:table-cell",
      skeletonClassName: "w-32",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <OfferingStatusBadge status={row.status as OfferingStatus} />,
      skeletonClassName: "w-16",
    },
    {
      id: "deadline",
      header: "Deadline",
      cell: (row) => (
        <span className="text-muted-foreground">{formatDate(row.markingDeadline)}</span>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-24",
    },
    {
      id: "progress",
      header: "Graded",
      cell: (row) => (
        <div className="space-y-1">
          <span className="text-sm tabular-nums">
            {row.graded} / {row.projects}
          </span>
          <CompletionBar percent={row.completion} />
        </div>
      ),
      skeletonClassName: "w-24",
    },
    {
      id: "cases",
      header: "Open cases",
      align: "end",
      cell: (row) => (
        <span
          className={
            row.openCases > 0 ? "font-medium tabular-nums text-amber-600" : "tabular-nums text-muted-foreground"
          }
        >
          {row.openCases}
        </span>
      ),
      skeletonClassName: "w-10",
    },
  ];

  const renderCard = (row: OfferingRow) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/offerings/${row.offeringId}`}
            className="block truncate font-medium underline-offset-4 hover:underline"
          >
            {row.moduleCode} {row.academicYear}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{row.moduleTitle}</p>
        </div>
        <OfferingStatusBadge status={row.status as OfferingStatus} />
      </div>
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Graded</span>
          <span className="tabular-nums">
            {row.graded} / {row.projects}
          </span>
        </div>
        <CompletionBar percent={row.completion} />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Open cases</span>
          <span className="tabular-nums">{row.openCases}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Deadline</span>
          <span>{formatDate(row.markingDeadline)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Offerings" value={data.totals.offerings} />
        <StatTile label="In marking" value={data.totals.inMarking} />
        <StatTile label="Projects" value={data.totals.projects} />
        <StatTile label="Graded" value={data.totals.graded} />
        <StatTile label="Open cases" value={data.totals.openCases} />
      </div>

      <DataTable
        columns={columns}
        rows={data.offerings}
        getRowId={(row) => row.offeringId}
        renderCard={renderCard}
        caption={`Offerings beneath ${data.unit.name}`}
        empty={
          <Card>
            <CardContent className="py-4">
              <Empty className="px-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Building2 aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No offerings yet</EmptyTitle>
                  <EmptyDescription>
                    Nothing beneath this unit is running an academic year. Create a module and
                    an offering of it before there is progress to watch.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
