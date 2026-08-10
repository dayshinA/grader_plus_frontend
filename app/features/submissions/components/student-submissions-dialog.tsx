import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import type { DashboardStudentEntry } from "~/features/dashboard/types";
import {
  useResolveDownloadUrl,
  useStudentSubmissions,
} from "~/features/submissions/api/use-submissions";
import type { SubmissionListItem } from "~/features/submissions/types";
import { isApiError } from "~/lib/api-client";
import { downloadUrlInNewTab } from "~/utils/download-file";

interface StudentSubmissionsDialogProps {
  moduleId: string;
  /** Null closes the dialog — the caller holds the selected row. */
  student: DashboardStudentEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether to render the per-file Download action (`submissions.download`). */
  canDownload: boolean;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  word: "Word",
  code: "Code",
  video: "Video",
  other: "File",
};

/**
 * One student's uploaded files, fetched when the dialog opens.
 *
 * Downloads resolve their presigned URL on click, never up front: the URL is good for 300 seconds,
 * so one fetched when the list rendered would already be dead. The bytes go browser-to-R2 directly
 * and never pass through this app.
 *
 * Mirrors `StudentMarkersDialog` on the Dashboard — same "click a roster row, see the detail"
 * shape, so the two screens read the same way.
 */
export function StudentSubmissionsDialog({
  moduleId,
  student,
  open,
  onOpenChange,
  canDownload,
}: StudentSubmissionsDialogProps) {
  const { data, isLoading, isError, error } = useStudentSubmissions(
    moduleId,
    student?.studentId,
  );
  const resolveUrl = useResolveDownloadUrl(moduleId);
  /** Which row is resolving, so only that button shows a spinner. */
  const [pendingId, setPendingId] = useState<string | null>(null);

  const submissions = data ?? [];

  function handleDownload(submission: SubmissionListItem) {
    if (!student) return;
    setPendingId(submission.id);
    resolveUrl.mutate(
      { studentId: student.studentId, submissionId: submission.id },
      {
        onSuccess: (response) => downloadUrlInNewTab(response.url),
        onError: (failure) =>
          toast.error(
            isApiError(failure)
              ? failure.message
              : "Couldn't get a download link for that file.",
          ),
        onSettled: () => setPendingId(null),
      },
    );
  }

  const columns: DataTableColumn<SubmissionListItem>[] = [
    {
      id: "file",
      header: "File",
      cell: (submission) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {submission.originalFilename}
          </p>
          <p className="text-xs text-muted-foreground">
            {FILE_TYPE_LABELS[submission.fileType] ?? submission.fileType} ·{" "}
            {formatDateTime(submission.uploadedAt)}
          </p>
        </div>
      ),
      skeletonClassName: "w-48",
    },
  ];

  if (canDownload) {
    columns.push({
      id: "download",
      header: <span className="sr-only">Download</span>,
      align: "end",
      cell: (submission) => (
        <Button
          variant="outline"
          size="sm"
          className="h-11 cursor-pointer sm:h-8"
          disabled={pendingId === submission.id}
          aria-busy={pendingId === submission.id}
          aria-label={`Download ${submission.originalFilename}`}
          onClick={() => handleDownload(submission)}
        >
          {pendingId === submission.id ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          Download
        </Button>
      ),
      skeletonClassName: "w-24",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="data-[size=default]:sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student?.fullName ?? "Submissions"}</DialogTitle>
          <DialogDescription>
            {student
              ? `${student.studentCode} · ${student.projectTitle}`
              : "The files uploaded for this student."}
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          // Not an empty state. SubmissionAccessGuard returns 403 MODULE_ACCESS_DENIED for a
          // coordinator who doesn't own the module and 404 STUDENT_NOT_FOUND otherwise — both
          // mean "you can't have these files", which is worth saying plainly rather than
          // dressing up as "no files yet".
          <Callout variant="error" title="Can't show these files">
            {isApiError(error) && error.statusCode === 403
              ? "Raw submission files are restricted to the module's own coordinator and the markers assigned to this student."
              : isApiError(error)
                ? error.message
                : "Something went wrong fetching this student's files."}
          </Callout>
        ) : (
          <DataTable
            columns={columns}
            rows={submissions}
            getRowId={(submission) => submission.id}
            isLoading={isLoading}
            skeletonRows={3}
            caption="Files uploaded for this student"
            empty={
              <Empty className="px-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No files yet</EmptyTitle>
                  <EmptyDescription>
                    This student exists in the module but nothing has been uploaded for them.
                    Re-run the ZIP import with their folder included.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
