import { useState } from "react";
import { toast } from "sonner";

import { BackLink } from "~/components/ui/back-link";
import { Badge } from "~/components/ui/badge";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ErrorCard } from "~/components/ui/error-card";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { NotFoundPage } from "~/components/ui/not-found-page";
import { PageHeader } from "~/components/ui/page-header";
import { Skeleton } from "~/components/ui/skeleton";
import { SubmitButton } from "~/components/ui/submit-button";
import { TextareaField } from "~/components/ui/textarea-field";
import { ASSIGNMENT_ROLE_LABELS } from "~/features/assignments/types";
import { useDiscrepancy, useResolveDiscrepancy } from "~/features/grading/api/use-grading";
import type { DiscrepancyDetail, MarkerEvaluationDetail } from "~/features/grading/types";
import type { RubricCriterion } from "~/features/rubrics/types";
import { useDeclaredBackTarget, type BackTarget } from "~/hooks/use-back-link";
import { formatDateTime, formatPercent } from "~/utils/format";
import { isApiError, isNotFound } from "~/lib/api-client";

const MINIMUM_NOTE = 10;

/** One marker's column: their total, their scores against each criterion, their feedback. */
function MarkerColumn({
  marker,
  criteria,
}: {
  marker: MarkerEvaluationDetail;
  criteria: RubricCriterion[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {marker.markerName}
          <Badge variant="outline">{ASSIGNMENT_ROLE_LABELS[marker.assignmentRole]}</Badge>
        </CardTitle>
        <CardDescription>
          {marker.totalPercentage === null
            ? "Has not finished yet."
            : `Total ${formatPercent(marker.totalPercentage)}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {criteria.map((criterion) => {
            const score = marker.scores.find((row) => row.criterionId === criterion.id);
            return (
              <li key={criterion.id} className="space-y-1 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm">{criterion.label}</p>
                  <p className="shrink-0 text-sm font-medium tabular-nums">
                    {score ? `${score.rawScore} / ${criterion.maxScore}` : "Not scored"}
                  </p>
                </div>
                {score?.comment && (
                  <p className="text-xs text-muted-foreground">{score.comment}</p>
                )}
              </li>
            );
          })}
        </ul>

        {marker.generalFeedback && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">General feedback</p>
            <p className="whitespace-pre-wrap text-sm">{marker.generalFeedback}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResolveForm({ detail }: { detail: DiscrepancyDetail }) {
  const resolve = useResolveDiscrepancy();
  const [acceptAverage, setAcceptAverage] = useState(true);
  const [mark, setMark] = useState(String(detail.calculatedAverage));
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  const markNumber = Number(mark);
  const markValid = Number.isFinite(markNumber) && markNumber >= 0 && markNumber <= 100;
  const noteValid = note.trim().length >= MINIMUM_NOTE;
  const canSubmit = acceptAverage || (markValid && noteValid);

  const error = resolve.error;
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Settle this case</CardTitle>
        <CardDescription>
          A case never resolves itself. Either take the calculated average, or enter your own
          mark and say why.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            resolve.mutate(
              {
                caseId: detail.case.id,
                payload: acceptAverage
                  ? { acceptAverage: true, comment: comment.trim() || undefined }
                  : { acceptAverage: false, mark: markNumber, note: note.trim() },
              },
              {
                onSuccess: ({ message }) =>
                  toast.success(message || "Case settled. The markers are told it is settled."),
              },
            );
          }}
        >
          <FormError error={error} />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">What is the final mark?</legend>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/40">
              <input
                type="radio"
                name="resolution"
                className="mt-1 size-4"
                checked={acceptAverage}
                onChange={() => setAcceptAverage(true)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  Take the calculated average, {formatPercent(detail.calculatedAverage)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  The mean of every submitted total on this project.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/40">
              <input
                type="radio"
                name="resolution"
                className="mt-1 size-4"
                checked={!acceptAverage}
                onChange={() => setAcceptAverage(false)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">Enter my own mark</span>
                <span className="block text-xs text-muted-foreground">
                  The final mark does not have to match either marker's total. The reason
                  you give below is kept as the record of why.
                </span>
              </span>
            </label>
          </fieldset>

          {acceptAverage ? (
            <TextareaField
              label="Comment"
              name="comment"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              hint="Optional. Anything worth recording about how this was settled."
            />
          ) : (
            <>
              <FormField
                label="Final mark"
                name="mark"
                type="number"
                min={0}
                max={100}
                step={0.01}
                required
                value={mark}
                onChange={(event) => setMark(event.target.value)}
                error={
                  mark !== "" && !markValid
                    ? "Use a number between 0 and 100."
                    : fieldError("mark")
                }
              />

              <TextareaField
                label="Reason"
                name="note"
                rows={4}
                required
                value={note}
                onChange={(event) => setNote(event.target.value)}
                hint={`At least ${MINIMUM_NOTE} characters. This is the record of why the mark was chosen.`}
                error={
                  note.trim().length > 0 && !noteValid
                    ? `Say a bit more than that: at least ${MINIMUM_NOTE} characters.`
                    : fieldError("note")
                }
              />
            </>
          )}

          <Callout variant="info">
            The markers are told the project is settled, and nothing else. Not the numbers,
            not each other, not the reason.
          </Callout>

          <SubmitButton
            isPending={resolve.isPending}
            pendingLabel="Settling"
            disabled={!canSubmit}
            className="sm:w-auto"
          >
            Settle case
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Only the 404 uses this. A case belongs to its offering's case list, but the response
 * carries no offering id to name that list with, so a dead end here can only offer home.
 */
const EXIT: BackTarget = { to: "/", label: "home" };

/**
 * The one screen where both markers' work appears side by side, reachable only by the
 * offering's coordinator and only once a case exists.
 *
 * Marks can still change while a case is open, because an edit after submitting silently
 * re-runs comparison, so this view is refetched rather than cached hard.
 */
export function DiscrepancyDetailPage({ caseId }: { caseId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = useDiscrepancy(caseId);
  // The response carries no offering id, so a cold entry genuinely has nowhere better than
  // home to offer. Reached the normal way, from an offering's case list, this is that list.
  const declaredBack = useDeclaredBackTarget();
  const back = declaredBack ?? EXIT;

  if (isNotFound(error)) {
    return (
      <NotFoundPage
        homeHref={back.to}
        backLabel={declaredBack ? `Back to ${back.label}` : `Go to ${back.label}`}
        title="No such case"
        description="That discrepancy case does not exist"
        helperText="It may have been settled and removed, or the link may be wrong."
      />
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorCard
          title="Could not load this case"
          error={error}
          description="Only the coordinator of the offering can open a discrepancy."
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const settled = data.case.status === "resolved";

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        title={data.project.studentName}
        description={data.project.title}
        actions={
          settled ? <Badge variant="success">Settled</Badge> : <Badge variant="warning">Open</Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Highest", value: formatPercent(data.case.highTotal) },
          { label: "Lowest", value: formatPercent(data.case.lowTotal) },
          { label: "Spread", value: `${data.case.spread}` },
          { label: "Average", value: formatPercent(data.calculatedAverage) },
        ].map((figure) => (
          <div key={figure.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-semibold tabular-nums">{figure.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{figure.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.markers.map((marker) => (
          <MarkerColumn key={marker.markerId} marker={marker} criteria={data.criteria} />
        ))}
      </div>

      {settled ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How this was settled</CardTitle>
            <CardDescription>
              {data.case.wasOverride
                ? "The coordinator entered their own figure."
                : "The coordinator took the calculated average."}{" "}
              {formatDateTime(data.case.resolvedAt)}
            </CardDescription>
          </CardHeader>
          {data.case.resolutionNote && (
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{data.case.resolutionNote}</p>
            </CardContent>
          )}
        </Card>
      ) : (
        <ResolveForm detail={data} />
      )}
    </div>
  );
}
