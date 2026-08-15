import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { SecretField } from "~/components/ui/secret-field";
import { useBulkImportUsers } from "~/features/users/api/use-users";
import type { BulkImportResult } from "~/features/users/types";
import { pluralise } from "~/utils/format";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * A spreadsheet of email, name, role and scope. The result is per row on both sides, and
 * the created rows carry a temporary password that is shown here once and never again, so
 * this screen stays on the result until it is dismissed.
 */
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
              {pluralise(result.created.length, "account")} created,{" "}
              {pluralise(result.failed.length, "row")} skipped. Rows are handled one at a
              time, so a failure further down did not undo what came before it.
            </DialogDescription>
          </DialogHeader>

          {result.created.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CircleCheck className="size-4 text-green-600" aria-hidden="true" />
                Created
              </p>
              <Callout variant="warning">
                Each password below is shown once. Copy them before closing this dialog.
              </Callout>
              <ScrollArea className="h-56 rounded-lg border border-border">
                <ul className="divide-y divide-border">
                  {result.created.map((row) => (
                    <li key={`${row.row}-${row.email}`} className="space-y-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.fullName}</p>
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

          {result.failed.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CircleX className="size-4 text-destructive" aria-hidden="true" />
                Skipped
              </p>
              <ScrollArea className="h-40 rounded-lg border border-border">
                <ul className="divide-y divide-border">
                  {result.failed.map((row) => (
                    <li key={`${row.row}-${row.email}`} className="p-3">
                      <p className="truncate text-sm">
                        Row {row.row} · {row.email || "no address"}
                      </p>
                      <p className="text-xs text-destructive">{row.reason}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button className="h-11 cursor-pointer sm:h-9" onClick={() => onOpenChange(false)}>
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
            One row per person. Every account is created with its first role, so the role and
            its scope belong in the file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError error={importUsers.error} />

          <Callout variant="info" title="Columns">
            <code className="text-xs">email</code>, <code className="text-xs">fullName</code>,{" "}
            <code className="text-xs">role</code>, and{" "}
            <code className="text-xs">scopeId</code> for everything but system_admin. Role is
            one of system_admin, unit_admin, coordinator or marker.
          </Callout>

          <FileInput
            accept={[".csv", ".xlsx", ".xls"]}
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
