import { CircleCheck, CircleMinus, CircleX } from "lucide-react";

import { Callout } from "~/components/ui/callout";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import type { ImportReport, ImportRowStatus } from "~/types/import-report";

const STATUS_ICONS = {
  created: CircleCheck,
  no_change: CircleMinus,
  failed: CircleX,
} as const;

const STATUS_ICON_CLASSES: Record<ImportRowStatus, string> = {
  created: "text-green-600",
  no_change: "text-muted-foreground",
  failed: "text-destructive",
};

const STATUS_LABELS: Record<ImportRowStatus, string> = {
  created: "created",
  no_change: "unchanged",
  failed: "failed",
};

/**
 * The result half every import shows the same way: the counts, a preview banner when the
 * report was a dry run, and the per row outcomes. Rows are independent on every route that
 * answers with a report, so a failed row further down never undoes an earlier one, and the
 * consuming dialog's copy says so rather than this component guessing at the wording.
 */
export function ImportReportView({
  report,
  statuses,
  className,
}: {
  report: ImportReport;
  /** Limit the row list to these statuses. The counts always cover the whole report. */
  statuses?: ImportRowStatus[];
  className?: string;
}) {
  const rows = statuses
    ? report.rows.filter((row) => statuses.includes(row.status))
    : report.rows;

  return (
    <div className={cn("space-y-3", className)}>
      {report.dryRun && (
        <Callout variant="info" title="Preview only">
          Nothing was written. Applying checks every row again from scratch, so the final
          result can differ from this preview.
        </Callout>
      )}

      <p className="text-sm" aria-live="polite">
        {report.totalRows} row{report.totalRows === 1 ? "" : "s"}:{" "}
        <span className="font-medium">{report.created} created</span>,{" "}
        {report.noChange} unchanged, {report.failed} failed.
      </p>

      {rows.length > 0 && (
        <ScrollArea className="max-h-64 rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const Icon = STATUS_ICONS[row.status];
              return (
                <li key={`${row.row}-${row.identifier}`} className="flex items-start gap-2 p-3">
                  <Icon
                    className={cn("mt-0.5 size-4 shrink-0", STATUS_ICON_CLASSES[row.status])}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      Row {row.row} · {row.identifier || "no value"}
                      <span className="sr-only"> {STATUS_LABELS[row.status]}</span>
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        row.status === "failed" ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {row.message}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
