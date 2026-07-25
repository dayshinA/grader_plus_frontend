import { Upload } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { FileInput } from "~/components/ui/file-input";
import { PageHeader } from "~/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useBulkImportUsers } from "~/features/users/api/use-bulk-import-users";
import type { BulkImportResult } from "~/features/users/types";
import { ApiError } from "~/lib/api-client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

function resultsToCsv(results: BulkImportResult["results"]): string {
  const header = "row,email,status,tempPassword,error";
  const lines = results.map((row) =>
    [row.row, row.email, row.status, row.tempPassword ?? "", row.error ?? ""]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const bulkImport = useBulkImportUsers();

  function handleSubmit() {
    if (!file) return;
    setValidationError(null);
    bulkImport.mutate(file);
  }

  function handleReset() {
    setFile(null);
    setValidationError(null);
    bulkImport.reset();
  }

  const result = bulkImport.data?.data;
  const apiMessage = bulkImport.data?.message;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/super-admin/users">← Back to users</Link>
        </Button>
      </div>

      <PageHeader title="Bulk import users" icon={Upload}>
        <p className="text-sm text-muted-foreground">
          Upload a .csv or .xlsx file with columns <code>email</code>, <code>fullName</code>,{" "}
          <code>role</code>, and an optional <code>learnId</code>. Up to 500 rows per file. Each
          created account gets a one-time temporary password shown below — there&apos;s no email
          delivery, so distribute it manually before leaving this page.
        </p>
      </PageHeader>

      {!result && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
          <FileInput
            accept={[".csv", ".xlsx"]}
            maxSizeBytes={MAX_SIZE_BYTES}
            disabled={bulkImport.isPending}
            onFileSelect={(selected) => {
              setFile(selected);
              setValidationError(null);
            }}
            onError={setValidationError}
          />

          {validationError && (
            <Alert
              variant="inline"
              status="error"
              timeout={0}
              title="File rejected"
              message={validationError}
            />
          )}

          {bulkImport.isError && (
            <Alert
              variant="inline"
              status="error"
              timeout={0}
              title="Import failed"
              message={
                bulkImport.error instanceof ApiError
                  ? bulkImport.error.message
                  : "Something went wrong. Please try again."
              }
            />
          )}

          <div>
            <Button onClick={handleSubmit} disabled={!file || bulkImport.isPending}>
              {bulkImport.isPending ? "Importing..." : "Import users"}
            </Button>
          </div>
        </div>
      )}

      {result && apiMessage && (
        <>
          <Alert
            variant="inline"
            status={result.errorCount > 0 ? "warning" : "success"}
            timeout={0}
            title={apiMessage}
            message={`${result.createdCount} created, ${result.errorCount} failed, out of ${result.totalRows} rows.`}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => downloadCsv(resultsToCsv(result.results), "bulk-import-results.csv")}
            >
              Download results as CSV
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Import another file
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Row</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Temp password / error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.results.map((row) => (
                  <TableRow key={row.row}>
                    <TableCell>{row.row}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "created" ? "default" : "destructive"}>
                        {row.status === "created" ? "Created" : "Error"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.status === "created" ? row.tempPassword : row.error}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
