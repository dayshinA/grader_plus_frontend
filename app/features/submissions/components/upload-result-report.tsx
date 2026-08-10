import { Badge } from "~/components/ui/badge";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import type {
  BulkSubmissionUploadResult,
  SubmissionUploadStudentResult,
  UnparsedZipEntry,
  UnparsedZipEntryReason,
} from "~/features/submissions/types";

/** Plain-language version of the backend's reason codes, since these are the actionable half. */
const UNPARSED_REASONS: Record<UnparsedZipEntryReason, string> = {
  FOLDER_NAME_FORMAT_INVALID:
    "Folder name isn't in the form studentId--Full Name--Project Title",
  FILE_NOT_IN_STUDENT_FOLDER: "File sat at the top level instead of inside a student's folder",
  METADATA_VALIDATION_FAILED: "Folder name parsed but one of its three parts was rejected",
  FILE_TOO_LARGE: "File exceeded the 250MB per-file limit",
};

const STUDENT_STATUS_LABELS: Record<SubmissionUploadStudentResult["status"], string> = {
  student_created: "New student",
  submissions_added: "Files added",
  error: "Error",
};

/**
 * What a ZIP import actually did, per student and per file, plus the entries it couldn't parse.
 *
 * Split out of the page because a bulk upload's *outcome* is the real content of this screen after
 * a run — nothing aborts the batch server-side, so a 201 can still describe a half-failed import,
 * and both halves have to be visible. The `unparsed` list leads: those are the folders a
 * coordinator has to rename and re-upload, and they're the easiest thing to miss.
 */
export function UploadResultReport({
  result,
  apiMessage,
}: {
  result: BulkSubmissionUploadResult;
  apiMessage: string;
}) {
  const failedFiles = result.results.reduce(
    (count, student) =>
      count + student.files.filter((file) => file.status === "error").length,
    0,
  );
  const failedStudents = result.results.filter((student) => student.status === "error").length;
  const hasProblems = result.unparsed.length > 0 || failedFiles > 0 || failedStudents > 0;

  const studentColumns: DataTableColumn<SubmissionUploadStudentResult>[] = [
    {
      id: "student",
      header: "Student",
      cell: (student) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{student.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {student.studentId} · {student.projectTitle}
          </p>
        </div>
      ),
      skeletonClassName: "w-48",
    },
    {
      id: "status",
      header: "Status",
      cell: (student) => (
        <Badge
          variant={
            student.status === "error"
              ? "destructive"
              : student.status === "student_created"
                ? "success"
                : "secondary"
          }
        >
          {STUDENT_STATUS_LABELS[student.status]}
        </Badge>
      ),
      skeletonClassName: "w-24",
    },
    {
      id: "files",
      header: "Files",
      align: "end",
      cell: (student) => {
        const created = student.files.filter((file) => file.status === "created").length;
        const failed = student.files.length - created;
        return (
          <span className="tabular-nums text-muted-foreground">
            {created} uploaded
            {failed > 0 && <span className="text-destructive"> · {failed} failed</span>}
          </span>
        );
      },
      skeletonClassName: "w-24",
    },
    {
      id: "detail",
      header: "Detail",
      cell: (student) => {
        const errors = [
          student.error,
          ...student.files
            .filter((file) => file.status === "error")
            .map((file) => `${file.originalFilename}: ${file.error ?? "upload failed"}`),
        ].filter(Boolean);
        return errors.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="text-xs break-words text-destructive">{errors.join(" · ")}</span>
        );
      },
      className: "hidden lg:table-cell",
      skeletonClassName: "w-40",
    },
  ];

  const renderStudentCard = (student: SubmissionUploadStudentResult) => {
    const created = student.files.filter((file) => file.status === "created").length;
    const failed = student.files.length - created;
    return (
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{student.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{student.studentId}</p>
          </div>
          <Badge
            variant={
              student.status === "error"
                ? "destructive"
                : student.status === "student_created"
                  ? "success"
                  : "secondary"
            }
          >
            {STUDENT_STATUS_LABELS[student.status]}
          </Badge>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-sm tabular-nums text-muted-foreground">
          {created} file{created === 1 ? "" : "s"} uploaded
          {failed > 0 && <span className="text-destructive"> · {failed} failed</span>}
        </p>
        {student.error && <p className="mt-1 text-xs text-destructive">{student.error}</p>}
      </div>
    );
  };

  const unparsedColumns: DataTableColumn<UnparsedZipEntry>[] = [
    {
      id: "entry",
      header: "ZIP entry",
      cell: (entry) => (
        <span className="font-mono text-xs break-all text-foreground">
          {entry.rawEntryName}
        </span>
      ),
      skeletonClassName: "w-48",
    },
    {
      id: "reason",
      header: "Why it was skipped",
      cell: (entry) => (
        <div className="min-w-0">
          <p className="text-sm text-foreground">{UNPARSED_REASONS[entry.reason]}</p>
          {entry.detail && (
            <p className="text-xs break-words text-muted-foreground">{entry.detail}</p>
          )}
        </div>
      ),
      skeletonClassName: "w-56",
    },
  ];

  const renderUnparsedCard = (entry: UnparsedZipEntry) => (
    <div className="rounded-xl border border-border p-4">
      <p className="font-mono text-xs break-all text-foreground">{entry.rawEntryName}</p>
      <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
        {UNPARSED_REASONS[entry.reason]}
      </p>
      {entry.detail && <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <Callout variant={hasProblems ? "warning" : "success"} title={apiMessage}>
        {result.filesUploaded} file{result.filesUploaded === 1 ? "" : "s"} uploaded across{" "}
        {result.studentsProcessed} student{result.studentsProcessed === 1 ? "" : "s"}, from{" "}
        {result.totalEntries} top-level {result.totalEntries === 1 ? "entry" : "entries"} in the
        ZIP.
        {hasProblems
          ? " Some entries need attention — see below."
          : " Nothing was skipped."}
      </Callout>

      {/* Deliberately first: these folders were skipped entirely, so they're the only part of the
          report that needs the coordinator to go and do something. */}
      {result.unparsed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Skipped entries ({result.unparsed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These weren&apos;t imported at all. Fix the folder names and upload the ZIP again —
              re-uploading adds to existing students rather than duplicating them.
            </p>
            <DataTable
              columns={unparsedColumns}
              rows={result.unparsed}
              getRowId={(entry) => entry.rawEntryName}
              renderCard={renderUnparsedCard}
              caption="ZIP entries that could not be parsed"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Students processed ({result.results.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={studentColumns}
            rows={result.results}
            getRowId={(student) => student.studentId}
            renderCard={renderStudentCard}
            caption="Result for each student folder in the uploaded ZIP"
          />
        </CardContent>
      </Card>
    </div>
  );
}
