// Mirrors src/common/import/import-report.ts, so the shape lives here rather than per feature.

export type ImportRowStatus = "created" | "no_change" | "failed";

export interface ImportRowResult {
  /** Spreadsheet row: worksheet position for XLSX, parsed position for CSV. */
  row: number;
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
