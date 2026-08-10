import { Loader2, RotateCw, Upload, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { ErrorCard } from "~/components/ui/error-card";
import { FileInput } from "~/components/ui/file-input";
import { ListPager } from "~/components/ui/list-pager";
import { ListToolbar } from "~/components/ui/list-toolbar";
import { PageHeader } from "~/components/ui/page-header";
import { useModuleSelection } from "~/features/academic-modules/api/use-module-selection";
import {
  ModulePicker,
  NoModulesCard,
} from "~/features/academic-modules/components/module-picker";
import { useAuth } from "~/features/auth/api/auth-context";
import { useDashboard } from "~/features/dashboard/api/use-dashboard";
import type { DashboardStudentEntry } from "~/features/dashboard/types";
import { findNavItem } from "~/features/dashboard/nav";
import { hasPermission } from "~/features/permissions/utils";
import { useBulkUploadSubmissions } from "~/features/submissions/api/use-submissions";
import { StudentSubmissionsDialog } from "~/features/submissions/components/student-submissions-dialog";
import { UploadResultReport } from "~/features/submissions/components/upload-result-report";
import { usePagedList } from "~/hooks/use-paged-list";
import { is403 } from "~/lib/api-client";

const nav = findNavItem("/workspace/submissions");

/** Matches the backend's `MAX_SUBMISSIONS_ZIP_SIZE_BYTES`. Mirrors it rather than exceeding it. */
const MAX_ZIP_SIZE_BYTES = 500 * 1024 * 1024;

/**
 * Student work for a module: the Learn ZIP import, and the files it produced.
 *
 * The roster comes from `GET .../dashboard` — the only endpoint that returns every student in a
 * module rather than only those with a marker assigned, which matters here because uploading is
 * what *creates* those students and assigning markers happens afterwards.
 *
 * ⚠️ The file routes sit behind `SubmissionAccessGuard`, which reads `module.coordinatorId`
 * directly and, uniquely in this API, does **not** cascade to Department or School Admin. A
 * Department Admin holding `submissions.view` still gets a 403 here. That's why the nav entry and
 * this screen gate on `submissions.upload` (the Coordinator's key) rather than the view key that
 * looks more natural — surfacing this screen to a Department Admin would only lead them to a wall.
 */
export function SubmissionsPage() {
  const { permissions } = useAuth();
  const { modules, moduleId, selectedModule, noModules, isLoading, onModuleChange } =
    useModuleSelection();
  const {
    data,
    isLoading: dashboardLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboard(moduleId ?? undefined);

  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<DashboardStudentEntry | null>(null);

  const bulkUpload = useBulkUploadSubmissions(moduleId ?? "");

  const canUpload = hasPermission(permissions, "submissions.upload");
  const canDownload = hasPermission(permissions, "submissions.download");

  const isForbidden = isError && is403(error);
  const students = useMemo(() => data?.students ?? [], [data]);
  const loading = isLoading || dashboardLoading;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query === "") return students;
    return students.filter(
      (student) =>
        student.fullName.toLowerCase().includes(query) ||
        student.studentCode.toLowerCase().includes(query) ||
        student.projectTitle.toLowerCase().includes(query),
    );
  }, [students, search]);

  const { rows, page, pageCount, setPage, total } = usePagedList(filtered);
  const hasFilters = search.trim() !== "";

  const uploadResult = bulkUpload.data?.data;
  const uploadMessage = bulkUpload.data?.message;

  function handleUpload() {
    if (!file || !moduleId) return;
    setValidationError(null);
    bulkUpload.mutate(file);
  }

  function handleResetUpload() {
    setFile(null);
    setValidationError(null);
    bulkUpload.reset();
  }

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
      skeletonClassName: "w-40",
    },
    {
      id: "project",
      header: "Project",
      cell: (student) => (
        <span className="text-muted-foreground">{student.projectTitle}</span>
      ),
      className: "hidden md:table-cell",
      skeletonClassName: "w-56",
    },
    {
      id: "files",
      header: <span className="sr-only">Files</span>,
      align: "end",
      cell: (student) => (
        <Button
          variant="outline"
          size="sm"
          className="h-11 cursor-pointer sm:h-8"
          onClick={() => setSelectedStudent(student)}
        >
          View files
        </Button>
      ),
      skeletonClassName: "w-24",
    },
  ];

  const renderCard = (student: DashboardStudentEntry) => (
    <div className="rounded-xl border border-border p-4">
      <p className="truncate font-medium text-foreground">{student.fullName}</p>
      <p className="truncate text-xs text-muted-foreground">
        {student.studentCode} · {student.projectTitle}
      </p>
      <Button
        variant="outline"
        className="mt-3 h-11 w-full cursor-pointer sm:h-9"
        onClick={() => setSelectedStudent(student)}
      >
        View files
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submissions"
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
        <NoModulesCard description="Submissions belong to a module. You don't coordinate any yet." />
      ) : (
        <>
          {canUpload && moduleId && (
            <Card>
              <CardHeader>
                <CardTitle>Import from Learn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {uploadResult && uploadMessage ? (
                  <>
                    <UploadResultReport result={uploadResult} apiMessage={uploadMessage} />
                    <Button
                      variant="outline"
                      className="h-11 cursor-pointer sm:h-9"
                      onClick={handleResetUpload}
                    >
                      <RotateCw aria-hidden="true" />
                      Upload another ZIP
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      A Learn ZIP export with one top-level folder per student, named{" "}
                      <code>studentId--Full Name--Project Title</code>, with that student&apos;s
                      files directly inside. Uploading again adds files to students who already
                      exist rather than duplicating them, so a corrected re-upload is safe.
                    </p>

                    <FileInput
                      accept={[".zip"]}
                      maxSizeBytes={MAX_ZIP_SIZE_BYTES}
                      disabled={bulkUpload.isPending}
                      onFileSelect={(selected) => {
                        setFile(selected);
                        setValidationError(null);
                      }}
                      onError={setValidationError}
                    />

                    {validationError && (
                      <Callout variant="error" title="File rejected">
                        {validationError}
                      </Callout>
                    )}

                    {bulkUpload.isError && (
                      <Callout variant="error" title="Upload failed">
                        {bulkUpload.error instanceof Error
                          ? bulkUpload.error.message
                          : "Something went wrong. Please try again."}
                      </Callout>
                    )}

                    <Button
                      className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
                      onClick={handleUpload}
                      disabled={!file || bulkUpload.isPending}
                      aria-busy={bulkUpload.isPending}
                    >
                      {bulkUpload.isPending ? (
                        <>
                          <Loader2
                            className="animate-spin motion-reduce:animate-none"
                            aria-hidden="true"
                          />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload aria-hidden="true" />
                          Upload ZIP
                        </>
                      )}
                    </Button>
                    {bulkUpload.isPending && (
                      <p className="text-xs text-muted-foreground" aria-live="polite">
                        Large exports take a while — every file inside the ZIP is uploaded to
                        storage one at a time. Don&apos;t close this tab.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {isError && !isForbidden ? (
            <ErrorCard
              title="Couldn't load the student list"
              error={error}
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : (
            <>
              <ListToolbar
                search={search}
                onSearchChange={setSearch}
                placeholder="Search by student, number, or project"
                searchLabel="Search students by name, number or project title"
              />

              <div className="space-y-4">
                <DataTable
                  columns={columns}
                  rows={rows}
                  getRowId={(student) => student.studentId}
                  renderCard={renderCard}
                  isLoading={loading}
                  caption="Students in this module, and their uploaded work"
                  empty={
                    <Card>
                      <CardContent className="py-4">
                        <Empty className="px-0">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <Users aria-hidden="true" />
                            </EmptyMedia>
                            <EmptyTitle>
                              {hasFilters ? "No matches" : "No students yet"}
                            </EmptyTitle>
                            <EmptyDescription>
                              {hasFilters
                                ? "Try a different search term, or clear the search."
                                : isForbidden
                                  ? "You don't have any students to see in this module."
                                  : canUpload
                                    ? `Nothing has been imported into ${selectedModule?.code ?? "this module"} yet. Upload a Learn ZIP export above and its students will appear here.`
                                    : `Nothing has been imported into ${selectedModule?.code ?? "this module"} yet.`}
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
                      {total} {total === 1 ? "student" : "students"}
                      {pageCount > 1 && ` · page ${page} of ${pageCount}`}
                    </p>
                    <ListPager page={page} pageCount={pageCount} onPageChange={setPage} />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {moduleId && (
        <StudentSubmissionsDialog
          // Remounted per student so the dialog never shows the previous student's files while
          // the new fetch is in flight.
          key={selectedStudent?.studentId ?? "none"}
          moduleId={moduleId}
          student={selectedStudent}
          open={selectedStudent !== null}
          onOpenChange={(next) => !next && setSelectedStudent(null)}
          canDownload={canDownload}
        />
      )}
    </div>
  );
}
