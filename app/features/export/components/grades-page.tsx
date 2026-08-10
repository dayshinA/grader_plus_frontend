import { FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
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
import { useGrades } from "~/features/export/api/use-grades";
import type { GradeRow, GradeSource } from "~/features/export/types";
import { usePagedList } from "~/hooks/use-paged-list";
import { is403 } from "~/lib/api-client";

const nav = findNavItem("/workspace/grades");

const GRADE_SOURCE_LABELS: Record<GradeSource, string> = {
  average: "Averaged",
  agreed_after_discrepancy: "Agreed after discrepancy",
  coordinator_confirmed: "Coordinator confirmed",
};

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
 * A module's final grades, read from `final_grades` only — never from individual evaluations.
 *
 * Held by School Admin, Department Admin, System Administrator (oversight) and the module's own
 * Coordinator, all via `grades.view`. The Learn-format CSV download is a separate permission
 * (`grades.export`, that Coordinator alone) and isn't built yet — when it is, it belongs in this
 * screen's `PageHeader` actions, gated on that key, not on a second screen.
 */
export function GradesPage() {
  const { modules, moduleId, selectedModule, noModules, isLoading, onModuleChange } =
    useModuleSelection();
  const {
    data,
    isLoading: gradesLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGrades(moduleId ?? undefined);

  const [search, setSearch] = useState("");

  const isForbidden = isError && is403(error);
  const grades = useMemo(() => data ?? [], [data]);
  const loading = isLoading || gradesLoading;

  const stats = useMemo(() => {
    if (grades.length === 0) return { count: 0, average: 0, agreed: 0 };
    const sum = grades.reduce((running, row) => running + row.finalScore, 0);
    return {
      count: grades.length,
      average: sum / grades.length,
      agreed: grades.filter((row) => row.gradeSource === "agreed_after_discrepancy").length,
    };
  }, [grades]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query === "") return grades;
    return grades.filter((row) => row.studentId.toLowerCase().includes(query));
  }, [grades, search]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "";

  const columns: DataTableColumn<GradeRow>[] = [
    {
      id: "student",
      header: "Student",
      cell: (row) => <span className="font-medium text-foreground">{row.studentId}</span>,
      skeletonClassName: "w-24",
    },
    {
      id: "score",
      header: "Final grade",
      align: "end",
      cell: (row) => (
        <span className="tabular-nums text-foreground">{formatScore(row.finalScore)}</span>
      ),
      skeletonClassName: "w-12",
    },
    {
      id: "source",
      header: "Source",
      cell: (row) => (
        <Badge variant={row.gradeSource === "average" ? "outline" : "secondary"}>
          {GRADE_SOURCE_LABELS[row.gradeSource] ?? row.gradeSource}
        </Badge>
      ),
      skeletonClassName: "w-28",
    },
    {
      id: "confirmed",
      header: "Confirmed",
      align: "end",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {formatDate(row.confirmedAt)}
        </span>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-24",
    },
  ];

  const renderCard = (row: GradeRow) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.studentId}</p>
          <p className="truncate text-xs text-muted-foreground">
            Confirmed {formatDate(row.confirmedAt)}
          </p>
        </div>
        <span className="shrink-0 text-lg tabular-nums text-foreground">
          {formatScore(row.finalScore)}
        </span>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <Badge variant={row.gradeSource === "average" ? "outline" : "secondary"}>
          {GRADE_SOURCE_LABELS[row.gradeSource] ?? row.gradeSource}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grades"
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
        <NoModulesCard description="Grades belong to a module. You don't coordinate or administer any yet." />
      ) : isError && !isForbidden ? (
        <ErrorCard
          title="Couldn't load grades"
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
                title: "Graded",
                value: stats.count,
                caption: selectedModule
                  ? `Students with a final grade in ${selectedModule.code}`
                  : "Students with a final grade",
              }}
            />
            <StatCard
              loading={loading}
              stat={{
                title: "Mean grade",
                value: stats.average,
                format: (value) => formatScore(value),
                caption: "Across the grades below",
              }}
            />
            <StatCard
              loading={loading}
              stat={{
                title: "After a discrepancy",
                value: stats.agreed,
                caption: "Settled by a coordinator, not averaged",
              }}
            />
          </div>

          {/* Without this the table reads as a bug on a part-marked module: the backend omits
              ungraded students entirely rather than returning them with a null score. */}
          {!loading && !isForbidden && (
            <Callout variant="info">
              Only students who already have a final grade appear here. A project still being
              marked, or one with an unresolved discrepancy, is left out until its grade lands.
            </Callout>
          )}

          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by student number"
            searchLabel="Search grades by student number"
          />

          <div className="space-y-4">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(row) => row.studentId}
              renderCard={renderCard}
              isLoading={loading}
              caption="Final grades for this module"
              empty={
                <Card>
                  <CardContent className="py-4">
                    <Empty className="px-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <FileSpreadsheet aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{hasFilters ? "No matches" : "No grades yet"}</EmptyTitle>
                        <EmptyDescription>
                          {hasFilters
                            ? "Try a different student number, or clear the search."
                            : isForbidden
                              ? "You don't have any grades to see yet."
                              : `Nothing in ${selectedModule?.code ?? "this module"} has a final grade. Grades land as marking completes and any discrepancies are settled.`}
                        </EmptyDescription>
                      </EmptyHeader>
                      {hasFilters && (
                        <Button
                          variant="outline"
                          className="h-11 cursor-pointer sm:h-9"
                          onClick={() => setSearch("")}
                        >
                          Clear search
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
                  {total} {total === 1 ? "grade" : "grades"}
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
