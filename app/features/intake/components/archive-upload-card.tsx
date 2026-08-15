import { useState } from "react";
import { CircleAlert, CircleCheck, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { FileInput } from "~/components/ui/file-input";
import { FormError } from "~/components/ui/form-error";
import { useUploadArchive } from "~/features/intake/api/use-intake";
import type { IntakeReport } from "~/features/intake/types";
import { pluralise } from "~/utils/format";

const MAX_BYTES = 512 * 1024 * 1024;

/**
 * The report is the working screen, not a summary. Folders that failed are listed
 * individually with their reason and never guessed at, because a guess here means the wrong
 * student's name on somebody's grade.
 */
function ReportPanel({ report }: { report: IntakeReport }) {
  const failed = report.failed.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Projects created", value: report.created },
          { label: "Matched existing", value: report.matchedExisting },
          { label: "Files stored", value: report.filesStored },
          { label: "Files replaced", value: report.filesReplaced },
        ].map((figure) => (
          <div key={figure.label} className="rounded-lg border border-border p-3">
            <p className="text-xl font-semibold tabular-nums">{figure.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{figure.label}</p>
          </div>
        ))}
      </div>

      {report.filesKeptBecauseAnnotated.length > 0 && (
        <Callout variant="info" title="Some files were left alone">
          A marker had already annotated the copy on record for these, so replacing the
          document would have moved their pins onto different pages.
          <ul className="mt-2 list-inside list-disc space-y-0.5">
            {report.filesKeptBecauseAnnotated.map((name) => (
              <li key={name} className="truncate font-mono text-xs">
                {name}
              </li>
            ))}
          </ul>
        </Callout>
      )}

      {failed > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CircleAlert className="size-4 text-amber-600" aria-hidden="true" />
            {pluralise(failed, "folder")} could not be read
          </p>
          <p className="text-sm text-muted-foreground">
            Nothing was guessed at. Create these by hand below, then attach their files.
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {report.failed.map((failure) => (
              <li key={failure.folder} className="p-3">
                <p className="truncate font-mono text-xs">{failure.folder}</p>
                <p className="mt-0.5 text-xs text-destructive">{failure.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Callout
          variant="success"
          title="Every folder parsed"
          icon={<CircleCheck className="size-4" />}
        >
          The archive went through cleanly. Check the project list underneath before moving on
          to the rubric.
        </Callout>
      )}
    </div>
  );
}

/** Upload a Learn archive, then show what happened to it. */
export function ArchiveUploadCard({
  offeringId,
  disabled,
}: {
  offeringId: string;
  disabled?: boolean;
}) {
  const upload = useUploadArchive(offeringId);
  const [file, setFile] = useState<File | null>(null);
  const [percent, setPercent] = useState(0);
  const [localError, setLocalError] = useState<string | undefined>();
  const [report, setReport] = useState<IntakeReport | undefined>();

  const uploading = upload.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Learn archive</CardTitle>
        <CardDescription>
          One request, so a large archive over a slow connection can time out. Upload
          progress below is real, and a failure says so rather than spinning.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <FormError error={upload.error} />

        {disabled ? (
          <Callout variant="warning" title="This offering is closed">
            Intake is a write, so it is refused. Reopening is a separate permission.
          </Callout>
        ) : (
          <>
            <FileInput
              accept={[".zip"]}
              maxSizeBytes={MAX_BYTES}
              disabled={uploading}
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

            {uploading && (
              <div className="space-y-1.5">
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Archive upload progress"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {percent < 100
                    ? `Uploading, ${percent}%`
                    : "Uploaded. Walking the archive, which takes longer than the upload did."}
                </p>
              </div>
            )}

            <Button
              type="button"
              className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
              disabled={!file || uploading}
              aria-busy={uploading}
              onClick={() => {
                if (!file) return;
                setPercent(0);
                setReport(undefined);
                upload.mutate(
                  { file, onProgress: setPercent },
                  {
                    onSuccess: ({ data, message }) => {
                      toast.success(message || "Archive processed.");
                      setReport(data.report);
                    },
                  },
                );
              }}
            >
              <Upload className="size-4" aria-hidden="true" />
              {uploading ? "Processing" : "Upload archive"}
            </Button>
          </>
        )}

        {report && <ReportPanel report={report} />}
      </CardContent>
    </Card>
  );
}
