import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { FormError } from "~/components/ui/form-error";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { TextareaField } from "~/components/ui/textarea-field";
import {
  useSaveFeedback,
  useSaveScores,
  useSubmitEvaluation,
} from "~/features/marking/api/use-marking";
import { AutosaveIndicator } from "~/features/marking/components/autosave-indicator";
import { useAutosave } from "~/features/marking/hooks/use-autosave";
import type { MarkingWorkspace, PutScoresPayload } from "~/features/marking/types";
import { formatPercent } from "~/utils/format";
import { isApiError } from "~/lib/api-client";

interface ScoreDraft {
  rawScore: string;
  comment: string;
}

function initialDraft(workspace: MarkingWorkspace): Record<string, ScoreDraft> {
  const draft: Record<string, ScoreDraft> = {};
  for (const criterion of workspace.rubric.criteria) {
    const existing = workspace.myEvaluation?.scores.find(
      (score) => score.criterionId === criterion.id,
    );
    draft[criterion.id] = {
      rawScore: existing ? String(existing.rawScore) : "",
      comment: existing?.comment ?? "",
    };
  }
  return draft;
}

/**
 * The caller's own rubric form.
 *
 * The displayed total comes from the save response and is never computed here: every save
 * recomputes it server side, and two implementations of one formula is two answers.
 *
 * Submitting is a deliberate act rather than the last autosave. An edit after submitting is
 * allowed and silently re-runs comparison, and the UI says nothing about what that concluded
 * because there is nothing to say: no hint, no badge, no inference from timing.
 */
export function ScoringForm({
  projectId,
  workspace,
  readOnly,
}: {
  projectId: string;
  workspace: MarkingWorkspace;
  readOnly: boolean;
}) {
  const saveScores = useSaveScores(projectId);
  const saveFeedback = useSaveFeedback(projectId);
  const submit = useSubmitEvaluation(projectId);

  const [scores, setScores] = useState<Record<string, ScoreDraft>>(() =>
    initialDraft(workspace),
  );
  const [feedback, setFeedback] = useState(workspace.myEvaluation?.generalFeedback ?? "");
  // From the server, on every save. Never derived from the fields above.
  const [total, setTotal] = useState<number | null>(
    workspace.myEvaluation?.totalPercentage ?? null,
  );
  const [status, setStatus] = useState(workspace.myEvaluation?.status ?? "draft");

  const scoreAutosave = useAutosave<PutScoresPayload>(async (payload) => {
    const evaluation = await saveScores.mutateAsync(payload);
    setTotal(evaluation.totalPercentage);
  });

  const feedbackAutosave = useAutosave<string>(async (value) => {
    await saveFeedback.mutateAsync({ generalFeedback: value });
  });

  const criteria = workspace.rubric.criteria;

  const unscored = useMemo(
    () => criteria.filter((criterion) => scores[criterion.id]?.rawScore.trim() === ""),
    [criteria, scores],
  );

  function scheduleScoreSave(next: Record<string, ScoreDraft>) {
    const payload: PutScoresPayload = {
      scores: criteria
        .filter((criterion) => next[criterion.id]?.rawScore.trim() !== "")
        .map((criterion) => ({
          criterionId: criterion.id,
          rawScore: Number(next[criterion.id].rawScore),
          comment: next[criterion.id].comment.trim() || undefined,
        })),
    };
    if (payload.scores.length === 0) return;
    scoreAutosave.schedule(payload);
  }

  function updateScore(criterionId: string, patch: Partial<ScoreDraft>) {
    setScores((current) => {
      const next = { ...current, [criterionId]: { ...current[criterionId], ...patch } };
      scheduleScoreSave(next);
      return next;
    });
  }

  const submitError = submit.error;
  const submitted = status === "final";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Your total</p>
            <p className="text-3xl font-semibold tabular-nums">
              {total === null ? "Not scored" : formatPercent(total)}
            </p>
          </div>
          <Badge variant={submitted ? "success" : "secondary"}>
            {submitted ? "Submitted" : "Draft"}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Worked out on the server on every save, so it is the same figure the grade is built
          from.
        </p>
      </div>

      {readOnly && (
        <Callout variant="warning" title="This offering is closed">
          Nothing can be saved on it now. What is on screen is what was recorded.
        </Callout>
      )}

      <div className="space-y-4">
        {criteria.map((criterion) => {
          const draft = scores[criterion.id] ?? { rawScore: "", comment: "" };
          const value = Number(draft.rawScore);
          const overMax = draft.rawScore !== "" && value > criterion.maxScore;

          return (
            <div key={criterion.id} className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{criterion.label}</p>
                  {criterion.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {criterion.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {criterion.weighting}%
                </Badge>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`score-${criterion.id}`}>
                    Score out of {criterion.maxScore}
                  </Label>
                  <Input
                    id={`score-${criterion.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={criterion.maxScore}
                    step={0.01}
                    disabled={readOnly}
                    className="h-11 sm:h-9"
                    aria-invalid={overMax || undefined}
                    value={draft.rawScore}
                    onChange={(event) =>
                      updateScore(criterion.id, { rawScore: event.target.value })
                    }
                    onBlur={() => scoreAutosave.flush()}
                  />
                </div>
              </div>

              {overMax && (
                <p role="alert" className="text-xs text-destructive">
                  {criterion.label} is scored out of {criterion.maxScore}.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor={`comment-${criterion.id}`}>Comment</Label>
                <Textarea
                  id={`comment-${criterion.id}`}
                  rows={2}
                  disabled={readOnly}
                  placeholder="What earned this score"
                  value={draft.comment}
                  onChange={(event) =>
                    updateScore(criterion.id, { comment: event.target.value })
                  }
                  onBlur={() => scoreAutosave.flush()}
                />
              </div>
            </div>
          );
        })}
      </div>

      <AutosaveIndicator state={scoreAutosave.state} error={scoreAutosave.error} />

      <div className="space-y-2">
        <TextareaField
          label="General feedback"
          name="generalFeedback"
          rows={6}
          disabled={readOnly}
          value={feedback}
          onChange={(event) => {
            setFeedback(event.target.value);
            feedbackAutosave.schedule(event.target.value);
          }}
          onBlur={() => feedbackAutosave.flush()}
          hint="Written to the student. Exported exactly as you write it, so read it back before submitting."
        />
        <AutosaveIndicator state={feedbackAutosave.state} error={feedbackAutosave.error} />
      </div>

      {!readOnly && (
        <div className="space-y-3 border-t border-border pt-4">
          <FormError error={submitError} />

          {isApiError(submitError) && submitError.code === "CRITERIA_UNSCORED" && (
            <Callout variant="warning" title="Some criteria still need a score">
              {submitError.message}
            </Callout>
          )}

          {unscored.length > 0 && !submitError && (
            <p className="text-xs text-muted-foreground">
              {unscored.length === 1
                ? "One criterion still needs a score"
                : `${unscored.length} criteria still need a score`}
              : {unscored.map((criterion) => criterion.label).join(", ")}.
            </p>
          )}

          <Button
            type="button"
            className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
            disabled={submit.isPending}
            aria-busy={submit.isPending}
            onClick={() => {
              // Flush first: submitting with a keystroke still in the debounce window
              // would submit the previous state.
              scoreAutosave.flush();
              feedbackAutosave.flush();
              submit.mutate(undefined, {
                onSuccess: ({ data, message }) => {
                  toast.success(message || "Submitted.");
                  setStatus(data.status);
                  setTotal(data.totalPercentage);
                },
              });
            }}
          >
            {submit.isPending ? "Submitting" : submitted ? "Resubmit" : "Submit marking"}
          </Button>

          {submitted && (
            <p className="text-xs text-muted-foreground">
              You can keep editing after submitting. Changes are recorded the same way, and
              resubmitting replaces what was recorded.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
