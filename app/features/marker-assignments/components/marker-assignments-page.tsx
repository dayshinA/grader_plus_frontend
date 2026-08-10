import { ListChecks, UserMinus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
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
import { useDashboard } from "~/features/dashboard/api/use-dashboard";
import { findNavItem } from "~/features/dashboard/nav";
import {
  useMarkerAssignments,
  useUnassignMarker,
} from "~/features/marker-assignments/api/use-marker-assignments";
import {
  AssignMarkerDialog,
  MAX_MARKERS_PER_STUDENT,
} from "~/features/marker-assignments/components/assign-marker-dialog";
import { BulkAssignCard } from "~/features/marker-assignments/components/bulk-assign-card";
import type { MarkerAssignmentListItem } from "~/features/marker-assignments/types";
import { usePagedList } from "~/hooks/use-paged-list";
import { is403 } from "~/lib/api-client";

const nav = findNavItem("/workspace/marker-assignments");

type CoverageFilter = "all" | "unassigned" | "assigned";

const COVERAGE_FILTERS: FilterTabOption<CoverageFilter>[] = [
  { id: "all", label: "All" },
  { id: "unassigned", label: "No markers" },
  { id: "assigned", label: "Has markers" },
];

/** One student, with whatever assignments they currently carry. */
interface StudentAssignmentRow {
  studentId: string;
  studentCode: string;
  fullName: string;
  projectTitle: string;
  assignments: MarkerAssignmentListItem[];
}

/**
 * Who marks what.
 *
 * The roster comes from `GET .../dashboard` — the only endpoint returning **every** student in the
 * module — with `GET .../marker-assignments` joined on by student for the assignment ids that
 * removal needs (the dashboard carries marker identity and status, but not the assignment's own
 * id). Driving the screen off the assignments endpoint alone would have hidden every student with
 * zero markers, which is precisely who this screen exists to fix.
 *
 * ⚠️ `markers.assign` is held **only** by a module-scoped Project Coordinator. No admin tier holds
 * it at any scope, so unlike almost every other module screen this one genuinely has a single
 * audience — there's no oversight-cascade case to design for.
 */
export function MarkerAssignmentsPage() {
  const { modules, moduleId, selectedModule, noModules, isLoading, onModuleChange } =
    useModuleSelection();

  const dashboard = useDashboard(moduleId ?? undefined);
  const assignments = useMarkerAssignments(moduleId ?? undefined);
  const unassign = useUnassignMarker(moduleId ?? "");

  const [search, setSearch] = useState("");
  const [coverage, setCoverage] = useState<CoverageFilter>("all");
  const [assigningTo, setAssigningTo] = useState<StudentAssignmentRow | null>(null);
  const [removing, setRemoving] = useState<MarkerAssignmentListItem | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

  const loading = isLoading || dashboard.isLoading || assignments.isLoading;
  // Either list 403ing means the same thing: nothing here for this account (decision #44).
  const isForbidden =
    (dashboard.isError && is403(dashboard.error)) ||
    (assignments.isError && is403(assignments.error));
  const hardError =
    (dashboard.isError && !is403(dashboard.error)) ||
    (assignments.isError && !is403(assignments.error));

  const rowsForModule = useMemo<StudentAssignmentRow[]>(() => {
    const byStudent = new Map<string, MarkerAssignmentListItem[]>();
    for (const assignment of assignments.data ?? []) {
      const existing = byStudent.get(assignment.studentId);
      if (existing) existing.push(assignment);
      else byStudent.set(assignment.studentId, [assignment]);
    }

    return (dashboard.data?.students ?? []).map((student) => ({
      studentId: student.studentId,
      studentCode: student.studentCode,
      fullName: student.fullName,
      projectTitle: student.projectTitle,
      assignments: byStudent.get(student.studentId) ?? [],
    }));
  }, [dashboard.data, assignments.data]);

  const counts = useMemo(
    () => ({
      students: rowsForModule.length,
      unassigned: rowsForModule.filter((row) => row.assignments.length === 0).length,
      assignments: (assignments.data ?? []).length,
    }),
    [rowsForModule, assignments.data],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rowsForModule.filter((row) => {
      if (coverage === "unassigned" && row.assignments.length > 0) return false;
      if (coverage === "assigned" && row.assignments.length === 0) return false;
      if (query === "") return true;
      return (
        row.fullName.toLowerCase().includes(query) ||
        row.studentCode.toLowerCase().includes(query) ||
        row.projectTitle.toLowerCase().includes(query) ||
        row.assignments.some(
          (assignment) =>
            assignment.markerFullName.toLowerCase().includes(query) ||
            assignment.markerEmail.toLowerCase().includes(query),
        )
      );
    });
  }, [rowsForModule, search, coverage]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "" || coverage !== "all";

  function openAssign(row: StudentAssignmentRow) {
    setDialogKey((value) => value + 1);
    setAssigningTo(row);
  }

  function handleUnassign() {
    if (!removing) return;
    unassign.mutate(removing.id, {
      onSuccess: ({ message }) => {
        setRemoving(null);
        toast.success(message);
      },
      onError: (failure) =>
        toast.error(
          failure instanceof Error ? failure.message : "Couldn't remove that marker.",
        ),
    });
  }

  /** The marker chips for one student, each with its own remove control. */
  function MarkerChips({ row }: { row: StudentAssignmentRow }) {
    if (row.assignments.length === 0) {
      return <span className="text-sm text-muted-foreground">No markers yet</span>;
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {row.assignments.map((assignment) => (
          <span
            key={assignment.id}
            className="inline-flex items-center gap-1 rounded-full border border-border py-0.5 pr-0.5 pl-2 text-xs"
          >
            <span className="text-foreground">{assignment.markerFullName}</span>
            {assignment.assignmentRole === "moderator" && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                Moderator
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-5 cursor-pointer text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${assignment.markerFullName} from ${row.fullName}`}
              onClick={() => setRemoving(assignment)}
            >
              <UserMinus className="size-3" aria-hidden="true" />
            </Button>
          </span>
        ))}
      </div>
    );
  }

  const columns: DataTableColumn<StudentAssignmentRow>[] = [
    {
      id: "student",
      header: "Student",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.studentCode} · {row.projectTitle}
          </p>
        </div>
      ),
      skeletonClassName: "w-44",
    },
    {
      id: "markers",
      header: "Markers",
      cell: (row) => <MarkerChips row={row} />,
      skeletonClassName: "w-56",
    },
    {
      id: "count",
      header: "Of 5",
      align: "end",
      cell: (row) => (
        <span
          className={
            row.assignments.length === 0
              ? "tabular-nums text-destructive"
              : "tabular-nums text-muted-foreground"
          }
        >
          {row.assignments.length}/{MAX_MARKERS_PER_STUDENT}
        </span>
      ),
      className: "hidden sm:table-cell",
      skeletonClassName: "w-10",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="h-11 cursor-pointer sm:h-8"
          disabled={row.assignments.length >= MAX_MARKERS_PER_STUDENT}
          onClick={() => openAssign(row)}
        >
          <UserPlus aria-hidden="true" />
          Assign
        </Button>
      ),
      skeletonClassName: "w-20",
    },
  ];

  const renderCard = (row: StudentAssignmentRow) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.studentCode} · {row.projectTitle}
          </p>
        </div>
        <span
          className={
            row.assignments.length === 0
              ? "shrink-0 text-sm tabular-nums text-destructive"
              : "shrink-0 text-sm tabular-nums text-muted-foreground"
          }
        >
          {row.assignments.length}/{MAX_MARKERS_PER_STUDENT}
        </span>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <MarkerChips row={row} />
      </div>
      <Button
        variant="outline"
        className="mt-3 h-11 w-full cursor-pointer sm:h-9"
        disabled={row.assignments.length >= MAX_MARKERS_PER_STUDENT}
        onClick={() => openAssign(row)}
      >
        <UserPlus aria-hidden="true" />
        Assign marker
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marker Assignments"
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
        <NoModulesCard description="Marker assignments belong to a module. You don't coordinate any yet." />
      ) : hardError ? (
        <ErrorCard
          title="Couldn't load marker assignments"
          error={dashboard.error ?? assignments.error}
          onRetry={() => {
            void dashboard.refetch();
            void assignments.refetch();
          }}
          isRetrying={dashboard.isFetching || assignments.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              loading={loading}
              stat={{
                title: "Students",
                value: counts.students,
                caption: selectedModule ? `In ${selectedModule.code}` : "In this module",
              }}
            />
            <StatCard
              loading={loading}
              stat={{
                title: "Without a marker",
                value: counts.unassigned,
                caption: "Nobody can start marking these yet",
              }}
            />
            <StatCard
              loading={loading}
              stat={{
                title: "Assignments",
                value: counts.assignments,
                caption: "Markers and moderators, across all projects",
              }}
            />
          </div>

          {!loading && counts.unassigned > 0 && (
            <Callout variant="warning" title={`${counts.unassigned} project${counts.unassigned === 1 ? "" : "s"} without a marker`}>
              A project with no marker assigned can never be graded. Use the &ldquo;No
              markers&rdquo; filter below to find them.
            </Callout>
          )}

          {moduleId && <BulkAssignCard moduleId={moduleId} />}

          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by student, project, or marker"
            searchLabel="Search by student name, number, project title, or marker"
            filters={
              <FilterTabs
                options={COVERAGE_FILTERS}
                value={coverage}
                onChange={setCoverage}
                label="Filter by marker coverage"
              />
            }
          />

          <div className="space-y-4">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(row) => row.studentId}
              renderCard={renderCard}
              isLoading={loading}
              caption="Students in this module and the markers assigned to each"
              empty={
                <Card>
                  <CardContent className="py-4">
                    <Empty className="px-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ListChecks aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>
                          {hasFilters ? "No matches" : "No students yet"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {hasFilters
                            ? "Try a different search term, or clear the filters."
                            : isForbidden
                              ? "You don't have any students to see in this module."
                              : `Nothing has been imported into ${selectedModule?.code ?? "this module"} yet. Upload a Learn ZIP export from the Submissions screen first — markers are assigned to students, so the students have to exist.`}
                        </EmptyDescription>
                      </EmptyHeader>
                      {hasFilters && (
                        <Button
                          variant="outline"
                          className="h-11 cursor-pointer sm:h-9"
                          onClick={() => {
                            setSearch("");
                            setCoverage("all");
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
                  {total} {total === 1 ? "student" : "students"}
                  {pageCount > 1 && ` · page ${page} of ${pageCount}`}
                </p>
                <ListPager page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      {moduleId && assigningTo && (
        <AssignMarkerDialog
          key={dialogKey}
          open
          onOpenChange={(next) => !next && setAssigningTo(null)}
          moduleId={moduleId}
          student={assigningTo}
          currentCount={assigningTo.assignments.length}
          assignedMarkerIds={assigningTo.assignments.map((item) => item.markerId)}
          onSuccess={(message) => toast.success(message)}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title="Remove this marker?"
        description={
          <>
            {removing?.markerFullName ?? "This marker"} will no longer see{" "}
            {removing?.studentFullName ?? "this student"}&apos;s project. Any evaluation they
            already started is <strong>not</strong> deleted — it stays on record and would come
            back if they were reassigned.
          </>
        }
        confirmLabel="Remove marker"
        pendingLabel="Removing…"
        destructive
        icon={UserMinus}
        isPending={unassign.isPending}
        onConfirm={handleUnassign}
      />
    </div>
  );
}
