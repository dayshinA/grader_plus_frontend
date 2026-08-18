import { useState } from "react";
import { Download, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ErrorCard } from "~/components/ui/error-card";
import { FileInput } from "~/components/ui/file-input";
import { FormError } from "~/components/ui/form-error";
import { Skeleton } from "~/components/ui/skeleton";
import {
  useDeleteSubmission,
  useSubmissions,
  useUploadSubmission,
} from "~/features/intake/api/use-intake";
import { intakeService } from "~/features/intake/api/intake.service";
import type { Project, Submission } from "~/features/intake/types";
import { formatDateTime, formatFileSize } from "~/utils/format";
import { downloadUrlInNewTab } from "~/utils/download-file";

const MAX_BYTES = 100 * 1024 * 1024;

/** The files on one project: what is attached, and adding or removing one. */
export function ProjectFilesDialog({
  open,
  onOpenChange,
  project,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  readOnly?: boolean;
}) {
  const { data, isPending, isError, error, refetch } = useSubmissions(project.id);
  const upload = useUploadSubmission(project.id);
  const remove = useDeleteSubmission(project.id);

  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState<Submission | undefined>();
  const [opening, setOpening] = useState<string | undefined>();

  /** Signed links are short lived, so one is asked for at the moment of use. */
  async function openFile(submission: Submission) {
    setOpening(submission.id);
    try {
      const { url } = await intakeService.submissionUrl(submission.id);
      downloadUrlInNewTab(url);
    } catch {
      toast.error("That link could not be issued. Try again in a moment.");
    } finally {
      setOpening(undefined);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Files for {project.studentNameSnapshot}</DialogTitle>
          <DialogDescription>
            PDF opens in the marking workspace with annotations. Anything else is download
            only, because pins would land in the wrong place on a reconverted document.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <ErrorCard title="Could not load files" error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is attached yet. A marker opening this project would have nothing to read.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(data ?? []).map((submission) => (
              <li key={submission.id} className="flex items-center gap-3 p-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{submission.originalFilename}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatFileSize(submission.sizeBytes)} ·{" "}
                    {formatDateTime(submission.uploadedAt)}
                  </p>
                </div>
                {submission.isAnnotatable ? (
                  <Badge variant="secondary">Annotatable</Badge>
                ) : (
                  <Badge variant="outline">Download only</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 cursor-pointer"
                  disabled={opening === submission.id}
                  onClick={() => void openFile(submission)}
                >
                  <Download className="size-4" aria-hidden="true" />
                  <span className="sr-only">Open {submission.originalFilename}</span>
                </Button>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 shrink-0 cursor-pointer text-destructive hover:text-destructive"
                    onClick={() => setDeleting(submission)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span className="sr-only">Remove {submission.originalFilename}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {readOnly ? (
          <Callout variant="warning">
            This offering is closed, so files can no longer be added or removed.
          </Callout>
        ) : (
          <div className="space-y-3">
            <FormError error={upload.error} />

            <FileInput
              accept={[".pdf", ".doc", ".docx", ".zip"]}
              maxSizeBytes={MAX_BYTES}
              disabled={upload.isPending}
              onFileSelect={(chosen) => {
                setFile(chosen);
                setLocalError(undefined);
              }}
              onError={setLocalError}
            />

            {localError && (
              <p role="alert" className="text-xs text-destructive">
                {localError}
              </p>
            )}

            <Button
              type="button"
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              disabled={!file || upload.isPending}
              aria-busy={upload.isPending}
              onClick={() => {
                if (!file) return;
                upload.mutate(file, {
                  onSuccess: ({ message }) => {
                    toast.success(message || "File attached.");
                    setFile(null);
                  },
                });
              }}
            >
              {upload.isPending ? "Uploading" : "Attach file"}
            </Button>
          </div>
        )}

        <ConfirmDialog
          open={Boolean(deleting)}
          onOpenChange={(next) => !next && setDeleting(undefined)}
          title={`Remove ${deleting?.originalFilename ?? "this file"}?`}
          description="The file is removed from the project. This is refused once marking has started on it, because deleting a document pulls the page out from under somebody's annotations."
          confirmLabel="Remove"
          pendingLabel="Removing"
          destructive
          isPending={remove.isPending}
          onConfirm={() => {
            if (!deleting) return;
            remove.mutate(deleting.id, {
              onSuccess: ({ message }) => {
                toast.success(message || "File removed.");
                setDeleting(undefined);
              },
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
