import { useState } from "react";
import { CircleCheck, Download } from "lucide-react";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { SecretField } from "~/components/ui/secret-field";
import { useBulkImportUsers } from "~/features/users/api/use-users";
import type { BulkImportResult } from "~/features/users/types";
import { downloadCsv } from "~/utils/download-file";
import { pluralise } from "~/utils/format";

const MAX_BYTES = 5 * 1024 * 1024;

const TEMPLATE_CSV =
  "email,full_name,role,school_code,unit_name,module_code,academic_year\n";

// The temporary passwords show once, so the screen stays on the result. No dry run on this route.
export function BulkImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const importUsers = useBulkImportUsers();
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const [result, setResult] = useState<BulkImportResult | undefined>();

  if (result) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import finished</DialogTitle>
            <DialogDescription>
              Rows are handled one at a time, so a failure further down did not
              undo what came before it.
            </DialogDescription>
          </DialogHeader>

          {result.createdUsers.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CircleCheck
                  className="size-4 text-green-600"
                  aria-hidden="true"
                />
                {pluralise(result.createdUsers.length, "account")} created
              </p>
              <Callout variant="warning">
                Each password below is shown once. Copy them before closing this
                dialog.
              </Callout>
              <ScrollArea className="h-56 rounded-lg border border-border">
                <ul className="divide-y divide-border">
                  {result.createdUsers.map((row) => (
                    <li
                      key={`${row.row}-${row.email}`}
                      className="space-y-2 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.fullName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Row {row.row} · {row.email}
                        </p>
                      </div>
                      <SecretField
                        label={`Temporary password for ${row.email}`}
                        value={row.temporaryPassword}
                      />
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          {/* no_change is not expected from this route yet, but render it if it appears
              rather than silently dropping a category the backend later turns on. */}
          <ImportReportView
            report={result.report}
            statuses={["failed", "no_change"]}
          />

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import accounts</DialogTitle>
          <DialogDescription>
            One row per person. Every account is created with its first role, so
            the role and its scope belong in the file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError error={importUsers.error} />

          <Callout variant="info" title="Columns">
            <code className="text-xs">email</code>,{" "}
            <code className="text-xs">full_name</code> and{" "}
            <code className="text-xs">role</code> (one of system_admin,
            unit_admin, coordinator or marker), then the scope columns that role
            uses:
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>system_admin: leave every scope column empty</li>
              <li>
                unit_admin: <code className="text-xs">school_code</code>, plus{" "}
                <code className="text-xs">unit_name</code> for a constituent
                unit
              </li>
              <li>
                coordinator and marker:{" "}
                <code className="text-xs">school_code</code>,{" "}
                <code className="text-xs">module_code</code> and{" "}
                <code className="text-xs">academic_year</code>, plus{" "}
                <code className="text-xs">unit_name</code> when the module sits
                under a constituent unit
              </li>
            </ul>
            <p className="mt-1">
              A value in a column the row&apos;s role does not use fails that
              row. Matching is case insensitive, and an ambiguous name is
              refused rather than guessed.
            </p>
          </Callout>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 cursor-pointer"
              onClick={() =>
                downloadCsv(TEMPLATE_CSV, "accounts-import-template.csv")
              }
            >
              <Download className="size-4" aria-hidden="true" />
              Download a template CSV
            </Button>
          </div>

          <FileInput
            accept={[".csv", ".xlsx"]}
            maxSizeBytes={MAX_BYTES}
            disabled={importUsers.isPending}
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
            disabled={!file || importUsers.isPending}
            aria-busy={importUsers.isPending}
            onClick={() => {
              if (!file) return;
              importUsers.mutate(file, {
                onSuccess: ({ data, message }) => {
                  toast.success(message || "Import finished.");
                  setResult(data);
                },
              });
            }}
          >
            {importUsers.isPending ? "Importing" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
