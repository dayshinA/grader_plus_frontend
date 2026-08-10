import { CalendarClock, GraduationCap, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { StatCard } from "~/components/ui/stat-card";
import { useAcademicModules } from "~/features/academic-modules/api/use-academic-modules";
import { useDashboard } from "~/features/dashboard/api/use-dashboard";
import { StudentMarkersDialog } from "~/features/dashboard/components/student-markers-dialog";
import { findNavItem } from "~/features/dashboard/nav";
import type { DashboardStudentEntry, OverallStatus } from "~/features/dashboard/types";
import { usePagedList } from "~/hooks/use-paged-list";

type StatusFilter = "all" | OverallStatus;

const STATUS_FILTERS: FilterTabOption<StatusFilter>[] = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "complete", label: "Complete" },
];

const nav = findNavItem("/workspace/dashboard");

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function overallStatusBadgeVariant(status: OverallStatus): "success" | "warning" | "outline" {
  if (status === "complete") return "success";
  if (status === "in_progress") return "warning";
  return "outline";
}

function overallStatusLabel(status: OverallStatus): string {
  if (status === "complete") return "Complete";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const moduleId = searchParams.get("moduleId");

  const { data: modules, isLoading: modulesLoading } = useAcademicModules();
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboard(moduleId ?? undefined);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedStudent, setSelectedStudent] = useState<DashboardStudentEntry | null>(null);

  // Landing screen — default to the caller's first accessible module rather than showing an
  // empty picker, unless a moduleId is already in the URL (deep link / a previous selection).
  useEffect(() => {
    if (moduleId || modulesLoading || !modules || modules.length === 0) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("moduleId", modules[0].id);
        return next;
      },
      { replace: true },
    );
  }, [moduleId, modulesLoading, modules, setSearchParams]);

  function handleModuleChange(id: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("moduleId", id);
        // A different module is a different cohort — page 3 of the old one means nothing here.
        next.delete("page");
        return next;
      },
      { replace: true },
    );
    setSearch("");
    setStatus("all");
  }

  const selectedModule = useMemo(
    () => modules?.find((module) => module.id === moduleId) ?? null,
    [modules, moduleId],
  );

  const students = useMemo(() => dashboard?.students ?? [], [dashboard]);

  const counts = useMemo(
    () => ({
      total: students.length,
      complete: students.filter((student) => student.overallStatus === "complete").length,
      inProgress: students.filter((student) => student.overallStatus === "in_progress").length,
      notStarted: students.filter((student) => student.overallStatus === "not_started").length,
    }),
    [students],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter(
      (student) =>
        (status === "all" || student.overallStatus === status) &&
        (query === "" ||
          student.fullName.toLowerCase().includes(query) ||
          student.studentCode.toLowerCase().includes(query) ||
          student.projectTitle.toLowerCase().includes(query)),
    );
  }, [students, search, status]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "" || status !== "all";

  const noModulesYet = !modulesLoading && (modules ?? []).length === 0;
  const isLoading = modulesLoading || (Boolean(moduleId) && dashboardLoading);

  const columns: DataTableColumn<DashboardStudentEntry>[] = [
    {
      id: "student",
      header: "Student",
      cell: (student) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{student.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{student.studentCode}</p>
        </div>
      ),
      skeletonClassName: "w-36",
    },
    {
      id: "project",
      header: "Project",
      cell: (student) => (
        <span className="text-muted-foreground">{student.projectTitle}</span>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-48",
    },
    {
      id: "status",
      header: "Status",
      cell: (student) => (
        <Badge variant={overallStatusBadgeVariant(student.overallStatus)}>
          {overallStatusLabel(student.overallStatus)}
        </Badge>
      ),
      skeletonClassName: "w-20",
    },
    {
      id: "progress",
      header: "Marked",
      align: "end",
      cell: (student) => (
        <span className="tabular-nums text-muted-foreground">
          {student.completedCount}/{student.totalMarkers}
        </span>
      ),
      skeletonClassName: "w-10",
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: (student) => (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          disabled={student.totalMarkers === 0}
          onClick={() => setSelectedStudent(student)}
        >
          View markers
        </Button>
      ),
      className: "w-32",
      skeletonClassName: "h-8 w-24 rounded-md",
    },
  ];

  const renderCard = (student: DashboardStudentEntry) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{student.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {student.studentCode} · {student.projectTitle}
          </p>
        </div>
        <Badge variant={overallStatusBadgeVariant(student.overallStatus)}>
          {overallStatusLabel(student.overallStatus)}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm tabular-nums text-muted-foreground">
          {student.completedCount}/{student.totalMarkers} marked
        </span>
        <Button
          variant="outline"
          className="h-9 cursor-pointer"
          disabled={student.totalMarkers === 0}
          onClick={() => setSelectedStudent(student)}
        >
          View markers
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={nav?.description}
        actions={
          !noModulesYet ? (
            <div className="w-full sm:w-72">
              <Select value={moduleId ?? undefined} onValueChange={handleModuleChange}>
                <SelectTrigger aria-label="Select a module">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {(modules ?? []).map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.code} — {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : undefined
        }
      />

      {noModulesYet ? (
        <Card>
          <CardContent className="py-4">
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GraduationCap aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No modules yet</EmptyTitle>
                <EmptyDescription>
                  You don't coordinate or administer any modules yet. Ask a System Administrator to
                  create one, or to grant you Department Admin access.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : isError ? (
        <ErrorCard
          title="Couldn't load the dashboard"
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              loading={isLoading}
              stat={{
                title: "Students",
                value: counts.total,
                caption: selectedModule ? `In ${selectedModule.code}` : "In this module",
              }}
            />
            <StatCard
              loading={isLoading}
              stat={{
                title: "Fully marked",
                value: counts.complete,
                caption: "Every assigned marker has submitted",
              }}
            />
            <StatCard
              loading={isLoading}
              stat={{
                title: "In progress",
                value: counts.inProgress,
                caption: "Some but not all markers done",
              }}
            />
            <StatCard
              loading={isLoading}
              stat={{
                title: "Not started",
                value: counts.notStarted,
                caption: "No marker has submitted yet",
              }}
            />
          </div>

          {dashboard?.deadlineApproaching && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
            >
              <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {selectedModule?.code ?? "This module"}'s marking deadline is{" "}
                {formatDate(dashboard.markingDeadline)}. Incomplete marking should be chased up now.
              </span>
            </div>
          )}

          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by student, code, or project"
            searchLabel="Search students by name, code or project title"
            filters={
              <FilterTabs
                options={STATUS_FILTERS}
                value={status}
                onChange={setStatus}
                label="Filter by marking status"
              />
            }
          />

          <div className="space-y-4">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(student) => student.studentId}
              renderCard={renderCard}
              isLoading={isLoading}
              caption="Marking progress per student"
              empty={
                <Card>
                  <CardContent className="py-4">
                    <Empty className="px-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Users aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{hasFilters ? "No matches" : "No students yet"}</EmptyTitle>
                        <EmptyDescription>
                          {hasFilters
                            ? "Try a different search term, or clear the filters."
                            : "Nothing has been imported for this module yet. Submissions appear here once they come in from Learn."}
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

            {!isLoading && rows.length > 0 && (
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

      <StudentMarkersDialog
        student={selectedStudent}
        open={selectedStudent !== null}
        onOpenChange={(open) => !open && setSelectedStudent(null)}
      />
    </div>
  );
}
