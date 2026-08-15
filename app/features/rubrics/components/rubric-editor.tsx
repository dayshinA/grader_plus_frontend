import { useMemo, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent } from "~/components/ui/card";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { TextareaField } from "~/components/ui/textarea-field";
import { useSaveRubric } from "~/features/rubrics/api/use-rubrics";
import type { PutRubricCriterion, Rubric } from "~/features/rubrics/types";
import { isApiError } from "~/lib/api-client";
import { cn } from "~/lib/utils";

interface DraftCriterion extends PutRubricCriterion {
  /** Local only, so React can key rows that have no server id yet. */
  key: string;
}

function toDraft(rubric: Rubric | undefined): DraftCriterion[] {
  if (!rubric) {
    return [{ key: crypto.randomUUID(), label: "", description: "", weighting: 100, maxScore: 100 }];
  }
  return rubric.criteria.map((criterion) => ({
    key: criterion.id,
    label: criterion.label,
    description: criterion.description ?? "",
    weighting: criterion.weighting,
    maxScore: criterion.maxScore,
  }));
}

/** The rounded sum, matching the two decimal comparison the server does. */
function totalWeighting(criteria: DraftCriterion[]): number {
  return (
    Math.round(criteria.reduce((sum, criterion) => sum + (criterion.weighting || 0), 0) * 100) /
    100
  );
}

/**
 * The rubric is a whole document, so the editor holds the full set and PUTs it.
 *
 * Once any evaluation exists in the offering, structural edits are refused: no adding,
 * removing or reweighting, because a coordinator moving a weighting mid marking moves the
 * totals underneath markers who have already submitted. Wording stays editable, and the
 * editor reflects that rather than letting the save fail.
 */
export function RubricEditor({
  offeringId,
  rubric,
  locked,
  readOnly,
}: {
  offeringId: string;
  rubric: Rubric | undefined;
  /** True once marking has produced an evaluation. Structure freezes, wording does not. */
  locked: boolean;
  /** True on a closed offering. Nothing is editable at all. */
  readOnly: boolean;
}) {
  const save = useSaveRubric(offeringId);

  const [title, setTitle] = useState(rubric?.title ?? "");
  const [criteria, setCriteria] = useState<DraftCriterion[]>(() => toDraft(rubric));

  const total = useMemo(() => totalWeighting(criteria), [criteria]);
  const weightingsValid = total === 100;
  const labelsValid = criteria.every((criterion) => criterion.label.trim().length >= 2);
  const scalesValid = criteria.every(
    (criterion) => criterion.maxScore > 0 && criterion.weighting > 0,
  );
  const canSave =
    !readOnly && title.trim().length >= 2 && weightingsValid && labelsValid && scalesValid;

  const error = save.error;
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined);

  function update(key: string, patch: Partial<DraftCriterion>) {
    setCriteria((current) =>
      current.map((criterion) => (criterion.key === key ? { ...criterion, ...patch } : criterion)),
    );
  }

  function addCriterion() {
    setCriteria((current) => [
      ...current,
      { key: crypto.randomUUID(), label: "", description: "", weighting: 0, maxScore: 100 },
    ]);
  }

  function removeCriterion(key: string) {
    setCriteria((current) => current.filter((criterion) => criterion.key !== key));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= criteria.length) return;
    setCriteria((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    save.mutate(
      {
        title: title.trim(),
        criteria: criteria.map((criterion) => ({
          label: criterion.label.trim(),
          description: criterion.description?.trim() || undefined,
          weighting: criterion.weighting,
          maxScore: criterion.maxScore,
        })),
      },
      { onSuccess: ({ message }) => toast.success(message || "Rubric saved.") },
    );
  }

  const structureLocked = locked || readOnly;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError error={error} />

      {readOnly ? (
        <Callout variant="warning" title="This offering is closed">
          The rubric is frozen along with everything else on it.
        </Callout>
      ) : locked ? (
        <Callout variant="warning" title="Structural edits are locked">
          Somebody has already recorded marking against this rubric. Adding, removing or
          reweighting a criterion would move totals underneath a marker who has already
          submitted, so only the wording is editable now.
        </Callout>
      ) : null}

      <FormField
        label="Rubric title"
        name="title"
        required
        disabled={readOnly}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldError("title")}
      />

      <div className="space-y-3">
        {criteria.map((criterion, index) => (
          <Card key={criterion.key}>
            <CardContent className="space-y-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GripVertical className="size-4" aria-hidden="true" />
                  Criterion {index + 1}
                </div>
                <div className="flex gap-1">
                  {!structureLocked && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 cursor-pointer"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <span aria-hidden="true">↑</span>
                        <span className="sr-only">Move criterion {index + 1} up</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 cursor-pointer"
                        disabled={index === criteria.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <span aria-hidden="true">↓</span>
                        <span className="sr-only">Move criterion {index + 1} down</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 cursor-pointer text-destructive hover:text-destructive"
                        disabled={criteria.length === 1}
                        onClick={() => removeCriterion(criterion.key)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Remove criterion {index + 1}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <FormField
                label="Label"
                name={`label-${criterion.key}`}
                required
                disabled={readOnly}
                value={criterion.label}
                onChange={(event) => update(criterion.key, { label: event.target.value })}
              />

              <TextareaField
                label="Description"
                name={`description-${criterion.key}`}
                rows={2}
                disabled={readOnly}
                value={criterion.description ?? ""}
                onChange={(event) => update(criterion.key, { description: event.target.value })}
                hint="What a marker is looking for. Shown beside the score field in the workspace."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Weighting"
                  name={`weighting-${criterion.key}`}
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  required
                  disabled={structureLocked}
                  value={criterion.weighting}
                  onChange={(event) =>
                    update(criterion.key, { weighting: Number(event.target.value) })
                  }
                  hint="Percentage of the final mark."
                />

                <FormField
                  label="Scored out of"
                  name={`maxScore-${criterion.key}`}
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  disabled={structureLocked}
                  value={criterion.maxScore}
                  onChange={(event) =>
                    update(criterion.key, { maxScore: Number(event.target.value) })
                  }
                  hint="The raw scale a marker enters against."
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!structureLocked && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
          onClick={addCriterion}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add criterion
        </Button>
      )}

      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          weightingsValid
            ? "border-border bg-muted/40"
            : "border-destructive/30 bg-destructive/10",
        )}
        aria-live="polite"
      >
        <div>
          <p className="text-sm font-medium">
            Weightings total{" "}
            <span className="tabular-nums">{total}</span>
            {!weightingsValid && " of 100"}
          </p>
          <p className="text-xs text-muted-foreground">
            {weightingsValid
              ? "Ready to save."
              : "They have to total exactly 100. Three criteria at 33.33 come to 99.99, which is genuinely invalid."}
          </p>
        </div>

        {!readOnly && (
          <SubmitButton
            isPending={save.isPending}
            pendingLabel="Saving"
            disabled={!canSave}
            className="sm:w-auto"
          >
            Save rubric
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
