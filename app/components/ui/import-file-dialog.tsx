import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FileInput } from "~/components/ui/file-input";
import { FormError } from "~/components/ui/form-error";
import { ImportReportView } from "~/components/ui/import-report-view";
import type { ApiResult } from "~/lib/api-client";
import type { ImportReport } from "~/types/import-report";
import { downloadCsv } from "~/utils/download-file";

/** Every tabular import route caps the file at 5MB, so the client check mirrors it. */
const MAX_TABULAR_BYTES = 5 * 1024 * 1024;

// Preview then apply. The preview is advisory, since apply re-validates from scratch.
export function ImportFileDialog({
  open,
  onOpenChange,
  title,
  description,
  columnsHelp,
  accept = [".csv", ".xlsx"],
  maxSizeBytes = MAX_TABULAR_BYTES,
  template,
  submit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Body of the "Columns" callout. The only documentation the uploader will read. */
  columnsHelp: ReactNode;
  accept?: string[];
  maxSizeBytes?: number;
  /** Offered as a "download a template" link so the headers start out right. */
  template?: { fileName: string; content: string };
  /** The route call. Rejections are rendered as the dialog's error banner. */
  submit: (file: File, dryRun: boolean) => Promise<ApiResult<ImportReport>>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();
  const [preview, setPreview] = useState<ImportReport | undefined>();
  const [applied, setApplied] = useState<ImportReport | undefined>();

  async function run(dryRun: boolean) {
    if (!file) return;
    setPending(true);
    setError(undefined);
    try {
      const { data, message } = await submit(file, dryRun);
      if (dryRun) {
        setPreview(data);
      } else {
        setPreview(undefined);
        setApplied(data);
        toast.success(message || "Import finished.");
      }
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  if (applied) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import finished</DialogTitle>
            <DialogDescription>
              Rows are handled one at a time, so a failure further down did not
              undo what came before it. Re-uploading the same file is safe:
              covered rows come back as unchanged.
            </DialogDescription>
          </DialogHeader>

          <ImportReportView report={applied} />

          <DialogFooter>
            <Button
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (preview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              This is what the file would do. Apply it to write the rows, or go
              back to pick a different file.
            </DialogDescription>
          </DialogHeader>

          <FormError error={error} />

          <ImportReportView report={preview} />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              disabled={pending}
              onClick={() => {
                setPreview(undefined);
                setError(undefined);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-11 cursor-pointer sm:h-9"
              disabled={pending}
              aria-busy={pending}
              onClick={() => void run(false)}
            >
              {pending ? "Applying" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError error={error} />

          <Callout variant="info" title="Columns">
            {columnsHelp}
          </Callout>

          {template && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer"
                onClick={() => downloadCsv(template.content, template.fileName)}
              >
                <Download className="size-4" aria-hidden="true" />
                Download a template CSV
              </Button>
            </div>
          )}

          <FileInput
            accept={accept}
            maxSizeBytes={maxSizeBytes}
            disabled={pending}
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
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 cursor-pointer sm:h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 cursor-pointer sm:h-9"
            disabled={!file || pending}
            aria-busy={pending}
            onClick={() => void run(true)}
          >
            {pending ? "Checking" : "Preview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
