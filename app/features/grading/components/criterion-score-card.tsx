import { Check, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Card, CardContent } from "~/components/ui/card";
import { FormField } from "~/components/ui/form-field";
import { TextareaField } from "~/components/ui/textarea-field";
import { useSaveScore } from "~/features/grading/api/use-evaluation";
import type { EvaluationScore } from "~/features/grading/types";
import type { RubricCriterionResponse } from "~/features/rubrics/types";
import { isApiError } from "~/lib/api-client";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * One rubric criterion: what it asks for, what it's worth, and the marker's score and note.
 *
 * **Autosaves on blur**, one request per criterion, because the alternative — a Save button per
 * criterion, or one for the whole form — either multiplies clicks by the number of criteria or
 * risks losing a long session's work. The endpoint is an upsert, so the first save creates the
 * score and later ones update it; nothing here needs to know which.
 *
 * Each card owns its own mutation, so a slow save on criterion 3 doesn't put criterion 4 in a
 * pending state.
 */
export function CriterionScoreCard({
  moduleId,
  studentId,
  criterion,
  score,
  index,
  submitError,
  disabled,
}: {
  moduleId: string;
  studentId: string;
  criterion: RubricCriterionResponse;
  /** The marker's existing score for this criterion, if they've given one. */
  score: EvaluationScore | undefined;
  index: number;
  /** Set when a submit-as-final attempt named this criterion as unscored. */
  submitError?: string;
  disabled?: boolean;
}) {
  const saveScore = useSaveScore(moduleId, studentId);

  const [scoreInput, setScoreInput] = useState(score ? String(score.score) : "");
  const [feedback, setFeedback] = useState(score?.feedback ?? "");
  const [state, setState] = useState<SaveState>("idle");
  const [validationError, setValidationError] = useState<string | undefined>();

  // What the server last confirmed, so a blur that changed nothing doesn't fire a request.
  const savedRef = useRef({
    score: score ? String(score.score) : "",
    feedback: score?.feedback ?? "",
  });

  // A save on any criterion replaces the whole cached evaluation, which re-renders every sibling
  // card. Without this, a card the marker is *currently typing in* would keep its own state (good)
  // while one they aren't would never pick up a value written elsewhere (e.g. after a refetch).
  useEffect(() => {
    if (!score) return;
    const incoming = { score: String(score.score), feedback: score.feedback ?? "" };
    if (
      incoming.score === savedRef.current.score &&
      incoming.feedback === savedRef.current.feedback
    ) {
      return;
    }
    savedRef.current = incoming;
    setScoreInput(incoming.score);
    setFeedback(incoming.feedback);
  }, [score]);

  function commit() {
    if (disabled) return;

    const trimmed = scoreInput.trim();
    if (trimmed === "") {
      // Nothing to save. Not an error — a marker working top to bottom leaves later criteria blank
      // on purpose, and the backend blocks going final while any are unscored anyway.
      setValidationError(undefined);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setValidationError("Whole numbers only, and not below zero.");
      return;
    }
    if (parsed > criterion.maxScore) {
      // Caught here as well as server-side (422 SCORE_OUT_OF_RANGE), so the marker is told before
      // a round trip rather than after one.
      setValidationError(`This criterion is out of ${criterion.maxScore}.`);
      return;
    }

    setValidationError(undefined);

    if (trimmed === savedRef.current.score && feedback === savedRef.current.feedback) return;

    setState("saving");
    saveScore.mutate(
      { criterionId: criterion.id, score: parsed, feedback: feedback.trim() || undefined },
      {
        onSuccess: () => {
          savedRef.current = { score: trimmed, feedback };
          setState("saved");
        },
        onError: (error) => {
          setState("error");
          setValidationError(
            isApiError(error) ? error.message : "Couldn't save that score. Try again.",
          );
        },
      },
    );
  }

  const error = submitError ?? validationError;

  return (
    <Card className={error ? "border-destructive/50" : undefined}>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              <span className="text-muted-foreground">{index + 1}. </span>
              {criterion.label}
            </p>
            {criterion.description && (
              <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                {criterion.description}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {criterion.weighting}% of the mark
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <FormField
            label={`Score (out of ${criterion.maxScore})`}
            type="number"
            inputMode="numeric"
            min={0}
            max={criterion.maxScore}
            step={1}
            value={scoreInput}
            disabled={disabled}
            onChange={(event) => setScoreInput(event.target.value)}
            onBlur={commit}
            error={error}
          />

          <TextareaField
            label="Note (optional)"
            value={feedback}
            disabled={disabled}
            rows={2}
            onChange={(event) => setFeedback(event.target.value)}
            onBlur={commit}
            hint="Why this score. The student sees it only if the coordinator exports feedback."
          />
        </div>

        <SaveIndicator state={state} />
      </CardContent>
    </Card>
  );
}

/** `aria-live` so a screen-reader user gets the same autosave confirmation a sighted one does. */
function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <p
      aria-live="polite"
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      {state === "saving" && (
        <>
          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Saving…
        </>
      )}
      {state === "saved" && (
        <>
          <Check className="size-3 text-emerald-600" aria-hidden="true" />
          Saved
        </>
      )}
      {state === "error" && (
        <>
          <TriangleAlert className="size-3 text-destructive" aria-hidden="true" />
          Not saved
        </>
      )}
    </p>
  );
}
