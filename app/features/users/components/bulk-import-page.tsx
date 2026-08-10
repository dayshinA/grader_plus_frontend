import { ChevronDown, ChevronRight, Download, Loader2, RotateCw, Upload } from "lucide-react";
import { useState } from "react";

import { BackLink } from "~/components/ui/back-link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { DataTable, type DataTableColumn } from "~/components/ui/data-table";
import { FileInput } from "~/components/ui/file-input";
import { PageHeader } from "~/components/ui/page-header";
import { useAcademicModules } from "~/features/academic-modules/api/use-academic-modules";
import { useDepartments } from "~/features/departments/api/use-departments";
import { useSchools } from "~/features/schools/api/use-schools";
import { useBulkImportUsers } from "~/features/users/api/use-bulk-import-users";
import type { BulkImportResult } from "~/features/users/types";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

const ROLE_TEMPLATE_KEYS = [
  "system_administrator",
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

  const resultColumns: DataTableColumn<BulkImportResult["results"][number]>[] = [
    {
      id: "row",
      header: "Row",
      cell: (row) => <span className="tabular-nums text-muted-foreground">{row.row}</span>,
      className: "w-16",
    },
    {
      id: "email",
      header: "Email",
      cell: (row) => <span className="text-foreground">{row.email}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "created" ? "success" : "destructive"}>
          {row.status === "created" ? "Created" : "Error"}
        </Badge>
      ),
    },
    {
      id: "detail",
      header: "Temp password / error",
      cell: (row) => (
        <span className="font-mono text-xs break-all">
          {row.status === "created" ? row.tempPassword : row.error}
        </span>
      ),
    },
  ];

  const renderResultCard = (row: BulkImportResult["results"][number]) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.email}</p>
          <p className="text-xs text-muted-foreground">Row {row.row}</p>
        </div>
        <Badge variant={row.status === "created" ? "success" : "destructive"}>
          {row.status === "created" ? "Created" : "Error"}
        </Badge>
      </div>
      <p className="mt-3 border-t border-border pt-3 font-mono text-xs break-all">
        {row.status === "created" ? row.tempPassword : row.error}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <BackLink fallback={{ to: "/super-admin/users", label: "Users" }} />

      <PageHeader
        title="Bulk import users"
        description="Create many accounts at once from a spreadsheet. Each one gets a one-time temporary password, shown here and nowhere else."
      />

      {!result && (
        <Card>
          <CardHeader>
            <CardTitle>What the file needs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              A .csv or .xlsx with columns <code>email</code>, <code>fullName</code>,{" "}
              <code>roleTemplateKey</code>, <code>scopeType</code>, <code>scopeId</code>, and an
              optional <code>learnId</code>. Up to 500 rows per file.
            </p>
            <ul className="list-inside list-disc space-y-1">
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
            <p>
              There's no <code>extraPermissionKeys</code> column — bulk import stays to a
              template's plain defaults. Add extras afterward from the delegation screen if a row
              needs them.
            </p>

            <Collapsible open={showIds} onOpenChange={setShowIds}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto cursor-pointer gap-1 p-0 text-sm font-medium text-foreground"
                >
                  {showIds ? (
                    <ChevronDown aria-hidden="true" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                  Where to find these ids
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3">
                <IdList label="Schools" isLoading={schools.isLoading} items={schools.data} />
                <IdList
                  label="Departments"
                  isLoading={departments.isLoading}
                  items={departments.data}
                />
                <IdList label="Modules" isLoading={modules.isLoading} items={modules.data} />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {!result && (
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <Callout variant="error" title="File rejected">
                {validationError}
              </Callout>
            )}

            {bulkImport.isError && (
              <Callout variant="error" title="Import failed">
                {bulkImport.error instanceof Error
                  ? bulkImport.error.message
                  : "Something went wrong. Please try again."}
              </Callout>
            )}

            <Button
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              onClick={handleSubmit}
              disabled={!file || bulkImport.isPending}
              aria-busy={bulkImport.isPending}
            >
              {bulkImport.isPending ? (
                <>
                  <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload aria-hidden="true" />
                  Import users
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {result && apiMessage && (
        <>
          <Callout
            variant={result.errorCount > 0 ? "warning" : "success"}
            title={apiMessage}
          >
            {result.createdCount} created, {result.errorCount} failed, out of {result.totalRows}{" "}
            rows. The temporary passwords below are shown once — download them before you leave.
          </Callout>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => downloadCsv(resultsToCsv(result.results), "bulk-import-results.csv")}
            >
              <Download aria-hidden="true" />
              Download results as CSV
            </Button>
            <Button
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={handleReset}
            >
              <RotateCw aria-hidden="true" />
              Import another file
            </Button>
          </div>

          <DataTable
            columns={resultColumns}
            rows={result.results}
            getRowId={(row) => row.row}
            renderCard={renderResultCard}
            caption="Result for each row of the imported file"
          />
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
