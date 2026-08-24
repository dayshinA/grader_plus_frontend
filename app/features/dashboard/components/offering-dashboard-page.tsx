import { useMemo, useState } from "react";
import { CircleDashed, CircleDot, CircleCheck, Users } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { FilterTabs, type FilterTabOption } from "~/components/ui/filter-tabs";
import { ListPager } from "~/components/ui/list-pager";
import { ListToolbar } from "~/components/ui/list-toolbar";
import { Skeleton } from "~/components/ui/skeleton";
import { ASSIGNMENT_ROLE_LABELS } from "~/features/assignments/types";
import { useOfferingDashboard } from "~/features/dashboard/api/use-dashboard";
import {
  MARKER_PROGRESS_LABELS,
  type MarkerProgressState,
  type OfferingDashboard,
} from "~/features/dashboard/types";
import { usePagedList } from "~/hooks/use-paged-list";
import { formatDateTime, formatRelativeDays, pluralise } from "~/utils/format";
import { cn } from "~/lib/utils";

type ProjectRow = OfferingDashboard["projects"][number];
type Filter = "all" | "incomplete" | "complete";

const FILTERS: FilterTabOption<Filter>[] = [
  { id: "all", label: "All" },
  { id: "incomplete", label: "Still marking" },
  { id: "complete", label: "All submitted" },
];

const STATE_STYLE: Record<MarkerProgressState, string> = {
  not_started: "text-muted-foreground",
  draft: "text-amber-600 dark:text-amber-400",
  submitted: "text-green-600 dark:text-green-400",
};

function StateIcon({ state }: { state: MarkerProgressState }) {
  const Icon =
    state === "submitted" ? CircleCheck : state === "draft" ? CircleDot : CircleDashed;
  return <Icon className={cn("size-4 shrink-0", STATE_STYLE[state])} aria-hidden="true" />;
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "warn" && value > 0 && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// States and timestamps, never a score, and this screen must not join grades on to get one.
export function OfferingDashboardPage({ offeringId }: { offeringId: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useOfferingDashboard(offeringId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.projects ?? []).filter((project) => {
      const allSubmitted =
        project.markers.length > 0 &&
        project.markers.every((marker) => marker.state === "submitted");
      const matchesFilter =
        filter === "all" ||
        (filter === "complete" && allSubmitted) ||
        (filter === "incomplete" && !allSubmitted);
      const matchesTerm = !term || project.studentName.toLowerCase().includes(term);
      return matchesFilter && matchesTerm;
    });
  }, [data, search, filter]);

  const paged = usePagedList(filtered, 15);

  if (isError) {
    return (
      <ErrorCard
        title="Could not load marking progress"
        error={error}
        description="A refusal here means your account holds no role covering this offering."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const hasFilters = search.trim() !== "" || filter !== "all";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Projects" value={data.progress.projects} />
        <StatTile label="Awaiting marking" value={data.progress.awaitingMarking} />
        <StatTile label="In progress" value={data.progress.inProgress} />
        <StatTile label="Awaiting moderation" value={data.progress.awaitingModeration} />
        <StatTile label="Graded" value={data.progress.graded} />
        <StatTile label="Open cases" value={data.progress.openCases} tone="warn" />
      </div>

      {data.offering.daysToDeadline !== null && data.offering.daysToDeadline <= 7 && (
        <Callout
          variant={data.offering.daysToDeadline < 0 ? "warning" : "info"}
          title={formatRelativeDays(data.offering.daysToDeadline)}
        >
          The deadline is shown to markers rather than enforced, so nothing stops a late
          submission. It is a prompt to chase, not a lock.
        </Callout>
      )}

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Search projects by student name"
        placeholder="Search projects"
        filters={
          <FilterTabs
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            label="Filter by marking progress"
          />
        }
      />

      {paged.total === 0 ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>{hasFilters ? "No projects match" : "Nothing to show"}</EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different search term, or clear the filters."
                    : data.progress.projects === 0
                      ? "This offering has no projects yet, so there is nothing being marked. Start with intake."
                      : "Projects exist but nobody is assigned to them yet. Marking progress appears once assignments are made."}
                </EmptyDescription>
              </EmptyHeader>
              {hasFilters && (
                <Button
                  variant="outline"
                  className="h-11 cursor-pointer sm:h-9"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {paged.rows.map((project: ProjectRow) => (
            <li key={project.projectId}>
              <Card>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-medium">{project.studentName}</p>
                    {project.excluded && <Badge variant="destructive">Excluded</Badge>}
                  </div>

                  <ul className="grid gap-2 sm:grid-cols-2">
                    {project.markers.map((marker) => (
                      <li
                        key={marker.markerId}
                        className="flex items-center gap-2 rounded-lg border border-border p-2.5"
                      >
                        <StateIcon state={marker.state} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{marker.markerName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ASSIGNMENT_ROLE_LABELS[marker.assignmentRole] ??
                              marker.assignmentRole}{" "}
                            · {MARKER_PROGRESS_LABELS[marker.state]}
                            {marker.submittedAt && ` ${formatDateTime(marker.submittedAt)}`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {project.markers.length < 2 && !project.excluded && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Fewer than two markers. This project cannot be graded as it stands.
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {paged.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {pluralise(paged.total, "project")}
            {paged.pageCount > 1 && ` · page ${paged.page} of ${paged.pageCount}`}
          </p>
          <ListPager page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </div>
      )}
    </div>
  );
}
