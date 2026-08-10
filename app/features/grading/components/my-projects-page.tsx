import { FileClock, PenLine } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
import { FilterTabs, type FilterTabOption } from "~/components/ui/filter-tabs";
import { ListPager } from "~/components/ui/list-pager";
import { ListToolbar } from "~/components/ui/list-toolbar";
import { PageHeader } from "~/components/ui/page-header";
import { StatCard } from "~/components/ui/stat-card";
import { useMarkerDashboard } from "~/features/dashboard/api/use-marker-dashboard";
import { findNavItem } from "~/features/dashboard/nav";
import type { MarkerDashboardItem, MarkingStatus } from "~/features/dashboard/types";
import { usePagedList } from "~/hooks/use-paged-list";
import { is403 } from "~/lib/api-client";

type StatusFilter = "all" | MarkingStatus;

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not started" },
  { id: "draft", label: "In progress" },
  { id: "final", label: "Submitted" },
];

const STATUS_LABELS: Record<MarkingStatus, string> = {
  not_started: "Not started",
  draft: "In progress",
  final: "Submitted",
};

const STATUS_VARIANTS: Record<MarkingStatus, "secondary" | "warning" | "success"> = {
  not_started: "secondary",
  draft: "warning",
  final: "success",
};

/** Outstanding work first — the list exists to answer "what do I still owe?". */
const STATUS_ORDER: Record<MarkingStatus, number> = {
  not_started: 0,
  draft: 1,
  final: 2,
};

const ACTION_LABELS: Record<MarkingStatus, string> = {
  not_started: "Start",
  draft: "Continue",
  final: "Review",
};

const nav = findNavItem("/marker/projects");

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * `:studentId` is the uuid; `?moduleId=` rides along because every grading route is nested under a
 * module and the student id alone doesn't identify one. Carrying it from the row we already have
 * avoids a lookup the marker has no endpoint for — a Marker holds no `modules.view`.
 */
function projectHref(item: MarkerDashboardItem): string {
  return `/marker/projects/${item.studentId}?moduleId=${item.moduleId}`;
}

/**
 * Everything assigned to the signed-in marker, across every module they mark on.
 *
 * Driven by `GET /markers/me/dashboard` alone — deliberately no module picker, unlike every
 * coordinator screen. That route is cross-module by design and is the only one in the API that
 * self-filters to the caller's own `marker_assignments` rows rather than resolving an RBAC scope.
 *
 * `status` is the marker's **own** progress and never anyone else's; the payload carries no
 * cross-marker field at all. A moderator appears here as an ordinary row with a badge, because a
 * moderator *is* a marker with a different `assignment_role` — never a separate section, which
 * would imply a different job.
 */
export function MyProjectsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useMarkerDashboard();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const isForbidden = isError && is403(error);
  const items = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      total: items.length,
      outstanding: items.filter((item) => item.status !== "final").length,
      draft: items.filter((item) => item.status === "draft").length,
      final: items.filter((item) => item.status === "final").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter(
        (item) =>
          (status === "all" || item.status === status) &&
          (query === "" ||
            item.studentFullName.toLowerCase().includes(query) ||
            item.studentCode.toLowerCase().includes(query) ||
            item.projectTitle.toLowerCase().includes(query) ||
            item.moduleCode.toLowerCase().includes(query) ||
            item.moduleName.toLowerCase().includes(query)),
      )
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [items, search, status]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "" || status !== "all";

  const columns: DataTableColumn<MarkerDashboardItem>[] = [
    {
      id: "student",
      header: "Student",
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{item.studentFullName}</p>
          <p className="truncate text-xs text-muted-foreground">{item.studentCode}</p>
        </div>
      ),
      skeletonClassName: "w-36",
    },
    {
      id: "project",
      header: "Project",
      cell: (item) => <span className="text-muted-foreground">{item.projectTitle}</span>,
      className: "hidden lg:table-cell",
      skeletonClassName: "w-48",
    },
    {
      id: "module",
      header: "Module",
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{item.moduleCode}</p>
          <p className="truncate text-xs text-muted-foreground">{item.moduleName}</p>
        </div>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-28",
    },
    {
      id: "role",
      header: "Role",
      // Only marked when it isn't the ordinary case — a "Marker" badge on every row would be noise.
      cell: (item) =>
        item.assignmentRole === "moderator" ? (
          <Badge variant="outline">Moderator</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      className: "hidden sm:table-cell",
      skeletonClassName: "w-20",
    },
    {
      id: "status",
      header: "Your progress",
      cell: (item) => (
        <Badge variant={STATUS_VARIANTS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
      ),
      skeletonClassName: "w-24",
    },
    {
      id: "submitted",
      header: "Submitted",
      align: "end",
      cell: (item) => (
        <span className="tabular-nums text-muted-foreground">
          {item.submittedAt ? formatDate(item.submittedAt) : "—"}
        </span>
      ),
      className: "hidden xl:table-cell",
      skeletonClassName: "w-24",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: (item) => (
        <Button asChild variant="outline" size="sm" className="h-11 sm:h-8">
          <Link to={projectHref(item)}>
            <PenLine aria-hidden="true" />
            {ACTION_LABELS[item.status]}
            <span className="sr-only"> marking {item.studentFullName}</span>
          </Link>
        </Button>
      ),
      skeletonClassName: "w-20",
    },
  ];

  const renderCard = (item: MarkerDashboardItem) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{item.studentFullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.studentCode} · {item.moduleCode}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={STATUS_VARIANTS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
          {item.assignmentRole === "moderator" && <Badge variant="outline">Moderator</Badge>}
        </div>
      </div>
      <p className="mt-2 truncate text-sm text-muted-foreground">{item.projectTitle}</p>
      <Button asChild variant="outline" className="mt-3 h-11 w-full sm:h-9">
        <Link to={projectHref(item)}>
          <PenLine aria-hidden="true" />
          {ACTION_LABELS[item.status]}
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="My Projects" description={nav?.description} />

      {isError && !isForbidden ? (
        <ErrorCard
          title="Couldn't load your projects"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              loading={isLoading}
              stat={{
                title: "Assigned to you",
                value: counts.total,
                caption: "Across every module you mark on",
              }}
            />
            <StatCard
              loading={isLoading}
              stat={{
                title: "Outstanding",
                value: counts.outstanding,
                caption: `${counts.draft} in progress`,
              }}
            />
            <StatCard
              loading={isLoading}
              stat={{
                title: "Submitted",
                value: counts.final,
                caption: "Marked final — still editable",
              }}
            />
          </div>

          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by student, project, or module"
            searchLabel="Search your projects by student name, student code, project title, or module"
            filters={
              <FilterTabs
                options={STATUS_FILTERS}
                value={status}
                onChange={setStatus}
                label="Filter by your marking progress"
              />
            }
          />

          <div className="space-y-4">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(item) => `${item.moduleId}:${item.studentId}`}
              renderCard={renderCard}
              isLoading={isLoading}
              caption="Projects assigned to you to mark"
              empty={
                <Card>
                  <CardContent className="py-4">
                    <Empty className="px-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <FileClock aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>
                          {hasFilters ? "No matches" : "Nothing assigned yet"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {hasFilters
                            ? "Try a different search term, or clear the filters."
                            : "A coordinator assigns projects to you. Once they do, they show up here — you'll be told by email when that happens."}
                        </EmptyDescription>
                      </EmptyHeader>
                      {hasFilters && (
                        <Button
                          variant="outline"
                          className="h-11 sm:h-9"
                          onClick={() => {
                            setSearch("");
                            setStatus("all");
                          }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </Empty>
                  </CardContent>
                </Card>
              }
            />

            {!isLoading && rows.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {total} {total === 1 ? "project" : "projects"}
                  {pageCount > 1 && ` · page ${page} of ${pageCount}`}
                </p>
                <ListPager page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
