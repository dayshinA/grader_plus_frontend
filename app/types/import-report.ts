// Mirrors src/common/import/import-report.ts on the backend. Every importer answers with
// one of these inside the standard envelope, so the shape lives here rather than being
// copied into each feature that uploads a file.

export type ImportRowStatus = "created" | "no_change" | "failed";

export interface ImportRowResult {
  /** Spreadsheet row: physical worksheet position for XLSX, parsed position for CSV. */
  row: number;
  /** What the row was about: the email, code or module code. */
  identifier: string;
  status: ImportRowStatus;
  /** Machine readable on some routes, e.g. SELF_GRANT_REFUSED. Most rows carry none. */
  code?: string;
  message: string;
}

export interface ImportReport {
  dryRun: boolean;
  totalRows: number;
  created: number;
  noChange: number;
  failed: number;
  rows: ImportRowResult[];
}
