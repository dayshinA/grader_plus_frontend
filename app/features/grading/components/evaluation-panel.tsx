import { CircleCheck, PenLine, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { ErrorCard } from "~/components/ui/error-card";
import { Skeleton } from "~/components/ui/skeleton";
import { TextareaField } from "~/components/ui/textarea-field";
import {
  useEvaluation,
  useMarkerRubric,
  useStartEvaluation,
  useUpdateEvaluation,
} from "~/features/grading/api/use-evaluation";
import { CriterionScoreCard } from "~/features/grading/components/criterion-score-card";
import type { EvaluationResponse } from "~/features/grading/types";
import type { RubricResponse } from "~/features/rubrics/types";
import { isApiError } from "~/lib/api-client";

/**
 * The marking side of the workspace: the rubric, the marker's own scores, their general feedback,
 * and the one-way-ish trip to final.
 *
 * Three states, in order: **no rubric** (the coordinator's problem, and the copy says so rather
 * than showing a code); **not started**, where the only action is to begin; and the scoring form.
 */
export function EvaluationPanel({
  moduleId,
  studentId,
}: {
  moduleId: string;
  studentId: string;
}) {
  const rubricQuery = useMarkerRubric(moduleId, studentId);
  const evaluationQuery = useEvaluation(moduleId, studentId);
  const start = useStartEvaluation(moduleId, studentId);

  if (rubricQuery.isLoading || evaluationQuery.isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // A missing rubric is a real, common state — the coordinator simply hasn't written one yet — so
  // it gets an explanation rather than an error card.
  if (isApiError(rubricQuery.error) && rubricQuery.error.code === "RUBRIC_NOT_FOUND") {
    return (
      <Callout variant="warning" title="No rubric yet">
        <p>
          The coordinator hasn't set up the marking criteria for this module, so there's nothing to
          score against. You'll be able to start once they have — nothing is needed from you in the
          meantime.
        </p>
      </Callout>
    );
  }

  if (rubricQuery.isError) {
    return (
      <ErrorCard
        title="Couldn't load the rubric"
        error={rubricQuery.error}
        onRetry={() => void rubricQuery.refetch()}
        isRetrying={rubricQuery.isFetching}
      />
    );
  }

  if (evaluationQuery.isError) {
    return (
      <ErrorCard
        title="Couldn't load your evaluation"
        error={evaluationQuery.error}
        onRetry={() => void evaluationQuery.refetch()}
        isRetrying={evaluationQuery.isFetching}
      />
    );
  }

  const rubric = rubricQuery.data;
  if (!rubric) return null;

  if (!evaluationQuery.data) {
    return (
      <StartEvaluationCard
        rubric={rubric}
        isPending={start.isPending}
        error={start.error}
        onStart={() =>
          start.mutate(undefined, {
            onSuccess: ({ message }) => toast.success(message),
          })
        }
      />
    );
  }

  return (
    <ScoringForm
      moduleId={moduleId}
      studentId={studentId}
      rubric={rubric}
      evaluation={evaluationQuery.data}
    />
  );
}

function StartEvaluationCard({
  rubric,
  isPending,
  error,
  onStart,
}: {
  rubric: RubricResponse;
  isPending: boolean;
  error: unknown;
  onStart: () => void;
}) {
  // The one 422 the marker will actually hit, and it isn't theirs to fix: the backend refuses to
  // start an evaluation until the rubric's weightings add up. Shown as an explanation of who needs
  // to do what, not as a failed action.
  const weightingsInvalid =
    isApiError(error) && error.code === "RUBRIC_WEIGHTINGS_INVALID";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{rubric.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {rubric.criteria.length} {rubric.criteria.length === 1 ? "criterion" : "criteria"} to
          score. Your marking is blind: nobody else's scores or comments are shown to you, and
          yours aren't shown to them.
        </p>

        <ul className="space-y-2 text-sm">
          {rubric.criteria.map((criterion) => (
            <li key={criterion.id} className="flex items-start justify-between gap-3">
              <span className="text-foreground">{criterion.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {criterion.weighting}% · out of {criterion.maxScore}
              </span>
            </li>
          ))}
        </ul>

        {weightingsInvalid ? (
          <Callout variant="warning" title="The rubric isn't ready yet">
            <p>
              Its criteria weightings don't add up to 100%, so marking can't start. The module's
              coordinator needs to fix that — there's nothing you can do from here.
            </p>
          </Callout>
        ) : (
          error != null && (
            <Callout variant="error" title="Couldn't start">
              <p>{isApiError(error) ? error.message : "Something went wrong. Try again."}</p>
            </Callout>
          )
        )}

        <Button onClick={onStart} disabled={isPending} className="h-11 w-full sm:h-9 sm:w-auto">
          <PenLine aria-hidden="true" />
          {isPending ? "Starting…" : "Start marking"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ScoringForm({
  moduleId,
  studentId,
  rubric,
  evaluation,
}: {
  moduleId: string;
  studentId: string;
  rubric: RubricResponse;
  evaluation: EvaluationResponse;
}) {
  const update = useUpdateEvaluation(moduleId, studentId);

  const [generalFeedback, setGeneralFeedback] = useState(evaluation.generalFeedback ?? "");
  const [confirming, setConfirming] = useState(false);
  // Per-criterion messages from a rejected submit — keyed by criterion id, which is exactly what
  // the backend's `errors[].field` carries for EVALUATION_INCOMPLETE.
  const [missing, setMissing] = useState<Record<string, string>>({});

  const isFinal = evaluation.status === "final";
  const scoreByCriterion = useMemo(
    () => new Map(evaluation.scores.map((score) => [score.criterionId, score])),
    [evaluation.scores],
  );
  const scoredCount = rubric.criteria.filter((criterion) =>
    scoreByCriterion.has(criterion.id),
  ).length;
  const allScored = scoredCount === rubric.criteria.length;

  function saveGeneralFeedback() {
    if (generalFeedback === (evaluation.generalFeedback ?? "")) return;
    update.mutate({ generalFeedback });
  }

  function submitFinal() {
    setMissing({});
    update.mutate(
      { status: "final" },
      {
        onSuccess: ({ message }) => {
          toast.success(message);
          setConfirming(false);
        },
        onError: (error) => {
          setConfirming(false);
          // The backend is the authority on completeness, not this screen — it re-checks at the
          // moment of submission, so a criterion scored in another tab (or cleared) is caught here
          // even when the local copy looked complete.
          if (isApiError(error) && error.code === "EVALUATION_INCOMPLETE") {
            setMissing(
              Object.fromEntries(
                (error.errors ?? []).map((entry) => [entry.field, entry.message]),
              ),
            );
            toast.error("Score every criterion before submitting.");
            return;
          }
          toast.error(isApiError(error) ? error.message : "Couldn't submit. Try again.");
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">{rubric.title}</CardTitle>
            <Badge variant={isFinal ? "success" : "warning"}>
              {isFinal ? "Submitted" : "Draft"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {scoredCount} of {rubric.criteria.length} criteria scored
            </span>
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {formatScore(evaluation.totalScore)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ 100</span>
            </span>
          </div>

          {isFinal && (
            <Callout variant="info" title="Submitted — but still yours to change">
              <p>
                You can still edit a score or your feedback after submitting. Doing so re-runs the
                comparison against the other markers, unless the coordinator has already settled
                this project.
              </p>
            </Callout>
          )}
        </CardContent>
      </Card>

      {rubric.criteria.map((criterion, index) => (
        <CriterionScoreCard
          key={criterion.id}
          moduleId={moduleId}
          studentId={studentId}
          criterion={criterion}
          score={scoreByCriterion.get(criterion.id)}
          index={index}
          submitError={missing[criterion.id]}
        />
      ))}

      <Card>
        <CardContent className="space-y-4 py-5">
          <TextareaField
            label="Overall feedback"
            value={generalFeedback}
            rows={5}
            onChange={(event) => setGeneralFeedback(event.target.value)}
            onBlur={saveGeneralFeedback}
            hint="Saved when you click away. Optional, and separate from your per-criterion notes."
          />

          {!isFinal && (
            <Button
              onClick={() => setConfirming(true)}
              disabled={!allScored || update.isPending}
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              <Send aria-hidden="true" />
              Submit as final
            </Button>
          )}

          {!isFinal && !allScored && (
            <p className="text-xs text-muted-foreground">
              Score every criterion to submit. {rubric.criteria.length - scoredCount} still to go.
            </p>
          )}

          {isFinal && evaluation.submittedAt && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
              Submitted {new Date(evaluation.submittedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Submit your marking as final?"
        description="Your scores go forward for comparison against the other markers on this project. If you and they are further apart than the module allows, the coordinator is asked to settle it."
        details={
          <p>
            You can still come back and change a score afterwards — submitting isn't a lock. Your
            total right now is <strong>{formatScore(evaluation.totalScore)}/100</strong>.
          </p>
        }
        confirmLabel="Submit as final"
        pendingLabel="Submitting…"
        isPending={update.isPending}
        icon={Send}
        onConfirm={submitFinal}
      />
    </div>
  );
}

/** Two decimals only when they carry information — 67 rather than 67.00. */
function formatScore(value: number): string {
  return String(Number(value.toFixed(2)));
}
