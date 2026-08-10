import { Loader2, RotateCw, Upload } from "lucide-react";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import { FileInput } from "~/components/ui/file-input";
import { useBulkAssignMarkers } from "~/features/marker-assignments/api/use-marker-assignments";
import type { BulkAssignmentRowResult } from "~/features/marker-assignments/types";

/** Matches the backend's `MAX_ASSIGNMENT_FILE_SIZE_BYTES`. */
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Bulk marker assignment from a spreadsheet, with its per-row result.
 *
 * The column contract gets spelled out prominently because of one trap: `studentId` here is the
 * student **number** from the Learn export, not the UUID this app uses internally everywhere else.
 * Coordinators author this file by hand and never see a UUID, so the backend takes the number —
 * but anyone who copies an id out of a URL will produce a file that fails every row.
 */
export function BulkAssignCard({ moduleId }: { moduleId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const bulkAssign = useBulkAssignMarkers(moduleId);

  const result = bulkAssign.data?.data;
  const apiMessage = bulkAssign.data?.message;

  function handleReset() {
    setFile(null);
    setValidationError(null);
    bulkAssign.reset();
  }

  const columns: DataTableColumn<BulkAssignmentRowResult>[] = [
    {
      id: "row",
      header: "Row",
      cell: (row) => <span className="tabular-nums text-muted-foreground">{row.row}</span>,
      className: "w-16",
      skeletonClassName: "w-8",
    },
    {
      id: "pair",
      header: "Student / marker",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{row.studentId}</p>
          <p className="truncate text-xs text-muted-foreground">{row.markerEmail}</p>
        </div>
      ),
      skeletonClassName: "w-40",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "created" ? "success" : "destructive"}>
          {row.status === "created" ? "Assigned" : "Error"}
        </Badge>
      ),
      skeletonClassName: "w-20",
    },
    {
      id: "error",
      header: "Detail",
      cell: (row) =>
        row.error ? (
          <span className="text-xs break-words text-destructive">{row.error}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      className: "hidden lg:table-cell",
      skeletonClassName: "w-40",
    },
  ];

  const renderCard = (row: BulkAssignmentRowResult) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.studentId}</p>
          <p className="truncate text-xs text-muted-foreground">{row.markerEmail}</p>
        </div>
        <Badge variant={row.status === "created" ? "success" : "destructive"}>
          {row.status === "created" ? "Assigned" : "Error"}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Row {row.row}</p>
      {row.error && (
        <p className="mt-2 border-t border-border pt-2 text-xs text-destructive">{row.error}</p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign in bulk</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result && apiMessage ? (
          <>
            <Callout
              variant={result.errorCount > 0 ? "warning" : "success"}
              title={apiMessage}
            >
              {result.createdCount} assigned, {result.errorCount} failed, out of{" "}
              {result.totalRows} rows. Rows are applied independently — a bad row never blocks the
              rest, so you can fix just those and re-upload.
            </Callout>

            <DataTable
              columns={columns}
              rows={result.results}
              getRowId={(row) => row.row}
              renderCard={renderCard}
              caption="Result for each row of the uploaded file"
            />

            <Button
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={handleReset}
            >
              <RotateCw aria-hidden="true" />
              Upload another file
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                A .csv or .xlsx with columns <code>studentId</code>, <code>markerEmail</code>, and
                an optional <code>role</code> (<code>marker</code> or <code>moderator</code>,
                defaulting to <code>marker</code>).
              </p>
              <Callout variant="warning" title="studentId is the student number">
                Use the student number from the Learn export — the same one shown in the table
                below — not the internal id from a URL. A file built from UUIDs will fail every
                row.
              </Callout>
            </div>

            <FileInput
              accept={[".csv", ".xlsx"]}
              maxSizeBytes={MAX_FILE_SIZE_BYTES}
              disabled={bulkAssign.isPending}
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

            {bulkAssign.isError && (
              <Callout variant="error" title="Upload failed">
                {bulkAssign.error instanceof Error
                  ? bulkAssign.error.message
                  : "Something went wrong. Please try again."}
              </Callout>
            )}

            <Button
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              onClick={() => file && bulkAssign.mutate(file)}
              disabled={!file || bulkAssign.isPending}
              aria-busy={bulkAssign.isPending}
            >
              {bulkAssign.isPending ? (
                <>
                  <Loader2
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  Assigning…
                </>
              ) : (
                <>
                  <Upload aria-hidden="true" />
                  Upload assignments
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
