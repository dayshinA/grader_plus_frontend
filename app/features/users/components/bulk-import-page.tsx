import { ChevronDown, ChevronRight, Upload } from "lucide-react";
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
import { useAcademicModules } from "~/features/academic-modules/api/use-academic-modules";
import { useDepartments } from "~/features/departments/api/use-departments";
import { useSchools } from "~/features/schools/api/use-schools";
import { useBulkImportUsers } from "~/features/users/api/use-bulk-import-users";
import type { BulkImportResult } from "~/features/users/types";
import { ApiError } from "~/lib/api-client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

const ROLE_TEMPLATE_KEYS = [
  "super_admin",
  "school_admin",
  "department_admin",
  "project_coordinator",
  "marker",
];
const SCOPE_TYPES = ["global", "school", "department", "module"];

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
  const [showIds, setShowIds] = useState(false);
  const bulkImport = useBulkImportUsers();

  // Sourced the same way `useScopeOptions` composes them for the delegation screen — every
  // school/department/module the caller (Super Admin only, on this page) can see, so a bulk
  // import author doesn't have to hand-copy a UUID from another tab.
  const schools = useSchools();
  const departments = useDepartments();
  const modules = useAcademicModules();

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
          <code>roleTemplateKey</code>, <code>scopeType</code>, <code>scopeId</code>, and an
          optional <code>learnId</code>. Up to 500 rows per file. Each created account gets a
          one-time temporary password shown below — there&apos;s no email delivery, so distribute
          it manually before leaving this page.
        </p>
      </PageHeader>

      {!result && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Column reference</p>
            <ul className="mt-1 list-inside list-disc">
              <li>
                <code>roleTemplateKey</code> — one of:{" "}
                {ROLE_TEMPLATE_KEYS.map((key, index) => (
                  <span key={key}>
                    <code>{key}</code>
                    {index < ROLE_TEMPLATE_KEYS.length - 1 ? ", " : ""}
                  </span>
                ))}
              </li>
              <li>
                <code>scopeType</code> — one of:{" "}
                {SCOPE_TYPES.map((type, index) => (
                  <span key={type}>
                    <code>{type}</code>
                    {index < SCOPE_TYPES.length - 1 ? ", " : ""}
                  </span>
                ))}
              </li>
              <li>
                <code>scopeId</code> — the school/department/module's id. Required unless{" "}
                <code>scopeType</code> is <code>global</code>, and left blank when it is.
              </li>
            </ul>
            <p className="mt-2">
              There's no <code>extraPermissionKeys</code> column — bulk import stays to a
              template's plain defaults. Add extras afterward from the delegation screen if a row
              needs them.
            </p>
          </div>

          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto gap-1 p-0 text-sm font-medium text-foreground"
              onClick={() => setShowIds((current) => !current)}
              aria-expanded={showIds}
            >
              {showIds ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Where to find these ids
            </Button>

            {showIds && (
              <div className="mt-2 flex flex-col gap-3">
                <IdList
                  label="Schools"
                  isLoading={schools.isLoading}
                  items={schools.data}
                />
                <IdList
                  label="Departments"
                  isLoading={departments.isLoading}
                  items={departments.data}
                />
                <IdList
                  label="Modules"
                  isLoading={modules.isLoading}
                  items={modules.data}
                />
              </div>
            )}
          </div>
        </div>
      )}

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

interface IdListProps {
  label: string;
  isLoading: boolean;
  items: { id: string; name: string }[] | undefined;
}

/** One school/department/module → id lookup block for the "where to find these ids" section. */
function IdList({ label, isLoading, items }: IdListProps) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground">{label}</p>
      {isLoading ? (
        <p className="text-xs">Loading...</p>
      ) : !items || items.length === 0 ? (
        <p className="text-xs">None visible to you.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="text-foreground">{item.name}</span>
              <code className="text-[11px] text-muted-foreground">{item.id}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
