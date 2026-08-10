import { ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";

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
import { useModuleSelection } from "~/features/academic-modules/api/use-module-selection";
import {
  ModulePicker,
  NoModulesCard,
} from "~/features/academic-modules/components/module-picker";
import { findNavItem } from "~/features/dashboard/nav";
import { useDiscrepancyCases } from "~/features/discrepancy/api/use-discrepancy-cases";
import type { DiscrepancyCaseSummary } from "~/features/discrepancy/types";
import { usePagedList } from "~/hooks/use-paged-list";
import { is403 } from "~/lib/api-client";

type StatusFilter = "all" | "open" | "resolved";

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
];

const nav = findNavItem("/workspace/discrepancies");

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Two decimals only when they carry information — 67 rather than 67.00. */
function formatScore(value: number): string {
  return String(Number(value.toFixed(2)));
}

/**
 * Every case where the markers on a project came out further apart than the module allows.
 *
 * Read-only. `discrepancies.view` (Department Admin, School Admin, System Administrator, and the
 * module's Coordinator) and `discrepancies.resolve` (that Coordinator alone) are separate
 * permissions — recording an agreed mark is the Coordinator's screen and isn't built yet.
 *
 * The high and the low mark are shown; which marker gave which is not, and the backend doesn't
 * send it. Blind isolation survives the flag.
 */
export function DiscrepanciesPage() {
  const { modules, moduleId, selectedModule, noModules, isLoading, onModuleChange } =
    useModuleSelection();
  const {
    data,
    isLoading: casesLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDiscrepancyCases(moduleId ?? undefined);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const isForbidden = isError && is403(error);
  const cases = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      total: cases.length,
      open: cases.filter((item) => item.status === "open").length,
      resolved: cases.filter((item) => item.status === "resolved").length,
    }),
    [cases],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cases.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        (query === "" ||
          item.studentFullName.toLowerCase().includes(query) ||
          item.studentToken.toLowerCase().includes(query) ||
          item.projectTitle.toLowerCase().includes(query)),
    );
  }, [cases, search, status]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "" || status !== "all";
  const loading = isLoading || casesLoading;

  const columns: DataTableColumn<DiscrepancyCaseSummary>[] = [
    {
      id: "student",
      header: "Student",
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{item.studentFullName}</p>
          <p className="truncate text-xs text-muted-foreground">{item.studentToken}</p>
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
      id: "spread",
      header: "High / low",
      align: "end",
      cell: (item) => (
        <span className="tabular-nums text-foreground">
          {formatScore(item.scoreHigh)} / {formatScore(item.scoreLow)}
        </span>
      ),
      skeletonClassName: "w-16",
    },
    {
      id: "gap",
      header: "Gap",
      align: "end",
      cell: (item) => (
        <span className="tabular-nums text-muted-foreground">
          {formatScore(item.scoreHigh - item.scoreLow)}
        </span>
      ),
      className: "hidden sm:table-cell",
      skeletonClassName: "w-10",
    },
    {
      id: "status",
      header: "Status",
      cell: (item) => (
        <Badge variant={item.status === "resolved" ? "success" : "warning"}>
          {item.status === "resolved" ? "Resolved" : "Open"}
        </Badge>
      ),
      skeletonClassName: "w-16",
    },
    {
      id: "outcome",
      header: "Agreed mark",
      align: "end",
      cell: (item) =>
        item.agreedMark === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="min-w-0">
            <p className="tabular-nums text-foreground">{formatScore(item.agreedMark)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.resolvedByFullName ?? item.resolvedByEmail ?? "Unknown"}
              {item.resolvedAt ? ` · ${formatDate(item.resolvedAt)}` : ""}
            </p>
          </div>
        ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-20",
    },
    {
      id: "flagged",
      header: "Flagged",
      align: "end",
      cell: (item) => (
        <span className="tabular-nums text-muted-foreground">{formatDate(item.flaggedAt)}</span>
      ),
      className: "hidden xl:table-cell",
      skeletonClassName: "w-24",
    },
  ];

  const renderCard = (item: DiscrepancyCaseSummary) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{item.studentFullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.studentToken} · {item.projectTitle}
          </p>
        </div>
        <Badge variant={item.status === "resolved" ? "success" : "warning"}>
          {item.status === "resolved" ? "Resolved" : "Open"}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="tabular-nums text-muted-foreground">
          High {formatScore(item.scoreHigh)} · Low {formatScore(item.scoreLow)}
        </span>
        <span className="tabular-nums text-foreground">
          {item.agreedMark === null ? "Not resolved" : `Agreed ${formatScore(item.agreedMark)}`}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discrepancies"
        description={nav?.description}
        actions={
          <ModulePicker
            modules={modules}
            moduleId={moduleId}
            onModuleChange={onModuleChange}
          />
        }
      />

      {noModules ? (
        <NoModulesCard description="Discrepancy cases belong to a module. You don't coordinate or administer any yet." />
      ) : isError && !isForbidden ? (
        <ErrorCard
          title="Couldn't load discrepancy cases"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              loading={loading}
              stat={{
                title: "Flagged",
                value: counts.total,
                caption: selectedModule ? `In ${selectedModule.code}` : "In this module",
              }}
            />
            <StatCard
              loading={loading}
              stat={{
                title: "Open",
                value: counts.open,
                caption: "Waiting on an agreed mark",
              }}
            />
            <StatCard
              loading={loading}
              stat={{
                title: "Resolved",
                value: counts.resolved,
                caption: "Agreed and written to the final grade",
              }}
            />
          </div>

          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by student, code, or project"
            searchLabel="Search discrepancy cases by student name, code or project title"
            filters={
              <FilterTabs
                options={STATUS_FILTERS}
                value={status}
                onChange={setStatus}
                label="Filter by case status"
              />
            }
          />

          <div className="space-y-4">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(item) => item.id}
              renderCard={renderCard}
              isLoading={loading}
              caption="Discrepancy cases for this module"
              empty={
                <Card>
                  <CardContent className="py-4">
                    <Empty className="px-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ClipboardCheck aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>
                          {hasFilters ? "No matches" : "Nothing flagged"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {hasFilters
                            ? "Try a different search term, or clear the filters."
                            : isForbidden
                              ? "You don't have any discrepancy cases to see yet."
                              : `No project in ${selectedModule?.code ?? "this module"} has markers further apart than its threshold. Cases appear here automatically as marking goes final.`}
                        </EmptyDescription>
                      </EmptyHeader>
                      {hasFilters && (
                        <Button
                          variant="outline"
                          className="h-11 cursor-pointer sm:h-9"
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

            {!loading && rows.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {total} {total === 1 ? "case" : "cases"}
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
