import { LayoutDashboard, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { PageHeader } from "~/components/ui/page-header";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "~/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { usePagination } from "~/hooks/use-pagination";
import { useAcademicModules } from "~/features/academic-modules/api/use-academic-modules";
import { useDashboard } from "~/features/dashboard/api/use-dashboard";
import { StudentMarkersDialog } from "~/features/dashboard/components/student-markers-dialog";
import type { DashboardStudentEntry, OverallStatus } from "~/features/dashboard/types";
import { ApiError } from "~/lib/api-client";

const PAGE_SIZE = 10;
const PAGINATION_ITEMS_TO_DISPLAY = 5;

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
  } = useDashboard(moduleId ?? undefined);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
        return next;
      },
      { replace: true },
    );
    setSearch("");
    setCurrentPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  const selectedModule = useMemo(
    () => modules?.find((module) => module.id === moduleId) ?? null,
    [modules, moduleId],
  );

  const filteredStudents = useMemo(() => {
    const students = dashboard?.students ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (student) =>
        student.fullName.toLowerCase().includes(query) ||
        student.studentCode.toLowerCase().includes(query) ||
        student.projectTitle.toLowerCase().includes(query),
    );
  }, [dashboard, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: safePage,
    totalPages,
    paginationItemsToDisplay: PAGINATION_ITEMS_TO_DISPLAY,
  });
  const pageRows = filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const noModulesYet = !modulesLoading && (modules ?? []).length === 0;
  const isLoading = modulesLoading || (Boolean(moduleId) && dashboardLoading);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Coordinator Dashboard" icon={LayoutDashboard}>
        {!noModulesYet && (
          <div className="max-w-sm">
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
        )}
      </PageHeader>

      {noModulesYet ? (
        <Alert
          variant="inline"
          status="info"
          timeout={0}
          title="No modules yet"
          message="You don't own or administer any modules yet. Ask a Super Admin to create one, or grant you Department Admin access."
        />
      ) : (
        <>
          {isError && (
            <Alert
              variant="inline"
              status="error"
              timeout={0}
              title="Couldn't load the dashboard"
              message={
                error instanceof ApiError
                  ? error.message
                  : "Something went wrong. Please try again."
              }
            />
          )}

          {dashboard?.deadlineApproaching && (
            <Alert
              variant="inline"
              status="warning"
              timeout={0}
              title="Marking deadline approaching"
              message={`${selectedModule?.code ?? "This module"}'s marking deadline is ${formatDate(dashboard.markingDeadline)}. Incomplete marking should be chased up now.`}
            />
          )}

          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              type="search"
              placeholder="Search by student, code, or project"
              className="pl-9"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              aria-label="Search students"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Loading dashboard...
                    </TableCell>
                  </TableRow>
                ) : pageRows.length ? (
                  pageRows.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>
                        <div className="font-medium">{student.fullName}</div>
                        <div className="text-xs text-muted-foreground">{student.studentCode}</div>
                      </TableCell>
                      <TableCell>{student.projectTitle}</TableCell>
                      <TableCell>
                        <Badge variant={overallStatusBadgeVariant(student.overallStatus)}>
                          {overallStatusLabel(student.overallStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.completedCount}/{student.totalMarkers}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={student.totalMarkers === 0}
                          onClick={() => setSelectedStudent(student)}
                        >
                          View markers
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {search ? "No students match your search." : "No students yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredStudents.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <span className="text-foreground">
                  {(safePage - 1) * PAGE_SIZE + 1}-
                  {Math.min(safePage * PAGE_SIZE, filteredStudents.length)}
                </span>{" "}
                of <span className="text-foreground">{filteredStudents.length}</span>
              </p>

              <Pagination className="mx-0 w-fit">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={safePage === 1}
                      aria-label="Go to previous page"
                    >
                      ←
                    </Button>
                  </PaginationItem>

                  {showLeftEllipsis && (
                    <>
                      <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    </>
                  )}

                  {pages.map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={safePage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  {showRightEllipsis && (
                    <>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={safePage === totalPages}
                      aria-label="Go to next page"
                    >
                      →
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
