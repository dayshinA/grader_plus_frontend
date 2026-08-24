import { useState } from "react";
import { CircleCheck, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ErrorCard } from "~/components/ui/error-card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { exportService } from "~/features/export/api/export.service";
import { useExportPreview } from "~/features/export/api/use-export";
import { downloadBlob } from "~/utils/download-file";
import { pluralise } from "~/utils/format";
import { isApiError } from "~/lib/api-client";

function Figure({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p
        className={
          tone === "warn" && value > 0
            ? "text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400"
            : "text-2xl font-semibold tabular-nums"
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// The preview comes first, so an incomplete export is a decision rather than a discovery.
export function ExportPage({ offeringId }: { offeringId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useExportPreview(offeringId);
  const [busy, setBusy] = useState<"grades" | "feedback" | undefined>();

  async function download(kind: "grades" | "feedback") {
    setBusy(kind);
    try {
      const file =
        kind === "grades"
          ? await exportService.grades(offeringId)
          : await exportService.feedbackBundle(offeringId);

      downloadBlob(
        file.data,
        file.filename ?? (kind === "grades" ? "grades.csv" : "feedback.zip"),
        kind === "grades" ? "text/csv;charset=utf-8;" : "application/zip",
      );
      toast.success(kind === "grades" ? "Grades downloaded." : "Feedback downloaded.");
    } catch (downloadError) {
      toast.error(
        isApiError(downloadError)
          ? downloadError.message
          : "That download could not be built. Try again.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  if (isError) {
    return (
      <ErrorCard
        title="Could not build the preview"
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  const complete = data.counts.missingGrade === 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Figure label="Projects" value={data.counts.projects} />
        <Figure label="Exportable" value={data.counts.exportable} />
        <Figure label="Excluded" value={data.counts.excluded} />
        <Figure label="No grade yet" value={data.counts.missingGrade} tone="warn" />
        <Figure label="Open cases" value={data.counts.openDiscrepancies} tone="warn" />
      </div>

      {complete ? (
        <Callout
          variant="success"
          title="Every project that can be graded has been"
          icon={<CircleCheck className="size-4" />}
        >
          Nothing is missing. Excluded projects are absent from the export by design.
        </Callout>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {pluralise(data.counts.missingGrade, "project")} would be missing
            </CardTitle>
            <CardDescription>
              Exporting now leaves these out. Each one says why, so this is a decision rather
              than something you find out about later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-56 rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {data.missing.map((row) => (
                  <li key={row.projectId} className="p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">{row.studentName}</p>
                      <p className="shrink-0 font-mono text-xs text-muted-foreground">
                        {row.learnId}
                      </p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{row.title}</p>
                    <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                      {row.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Callout variant="warning" title="Before you send anything on">
        {data.warning}
      </Callout>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
              Grades
            </CardTitle>
            <CardDescription>
              A CSV of final marks. Read from final_grades and nowhere else, so nothing in it
              is assembled from individual evaluations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              disabled={busy !== undefined || data.counts.exportable === 0}
              aria-busy={busy === "grades"}
              onClick={() => void download("grades")}
            >
              <Download className="size-4" aria-hidden="true" />
              {busy === "grades" ? "Building" : "Download grades"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
              Feedback
            </CardTitle>
            <CardDescription>
              A zip of one document per graded project. Each names no marker: it says what was
              said, not who said it. Annotations are not included.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              disabled={busy !== undefined || data.counts.exportable === 0}
              aria-busy={busy === "feedback"}
              onClick={() => void download("feedback")}
            >
              <Download className="size-4" aria-hidden="true" />
              {busy === "feedback" ? "Building" : "Download feedback"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {data.counts.exportable === 0 && (
        <p className="text-sm text-muted-foreground">
          There is nothing to export yet: no project on this offering has a final grade.
        </p>
      )}
    </div>
  );
}
