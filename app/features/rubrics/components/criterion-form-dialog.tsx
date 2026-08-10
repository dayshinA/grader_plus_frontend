import { useState, type FormEvent } from "react";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { TextareaField } from "~/components/ui/textarea-field";
import {
  useCreateCriterion,
  useUpdateCriterion,
} from "~/features/rubrics/api/use-rubric-mutations";
import type { RubricCriterionResponse } from "~/features/rubrics/types";
import { isApiError } from "~/lib/api-client";

interface CriterionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  moduleId: string;
  /** Required in "edit" mode. */
  criterion?: RubricCriterionResponse;
  /**
   * The weighting already allocated across the *other* criteria, used only for the live
   * "this leaves x% unallocated" hint. Advisory: the backend accepts any total at save time and
   * only rejects it when a marker tries to start an evaluation.
   */
  allocatedElsewhere: number;
  onSuccess?: (mode: "create" | "edit", apiMessage: string) => void;
}

const EMPTY_FORM = { label: "", description: "", weighting: "", maxScore: "100" };

/** Two decimals, but only when they carry information — 25 rather than 25.00. */
function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/**
 * One rubric criterion: what markers score, what it's worth, and the scale it's scored on.
 *
 * `displayOrder` is never sent. The backend auto-assigns `MAX + 1` on create, which is what
 * "add another one to the end" means, and it's left untouched on edit — reordering would need a
 * drag surface the requirements don't ask for, and sending a guessed value here would silently
 * shuffle the list markers see.
 *
 * Remounted by its caller via a changing `key` rather than resetting itself in an effect — the
 * same convention as `ModuleFormDialog`.
 */
export function CriterionFormDialog({
  open,
  onOpenChange,
  mode,
  moduleId,
  criterion,
  allocatedElsewhere,
  onSuccess,
}: CriterionFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && criterion
      ? {
          label: criterion.label,
          description: criterion.description,
          weighting: String(criterion.weighting),
          maxScore: String(criterion.maxScore),
        }
      : EMPTY_FORM,
  );

  const createCriterion = useCreateCriterion(moduleId);
  const updateCriterion = useUpdateCriterion(moduleId);
  const mutation = mode === "create" ? createCriterion : updateCriterion;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const request = {
      label: form.label.trim(),
      description: form.description.trim(),
      weighting: Number(form.weighting),
      maxScore: Number(form.maxScore),
    };

    if (mode === "create") {
      createCriterion.mutate(request, {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.("create", message);
        },
      });
      return;
    }

    if (!criterion) return;
    updateCriterion.mutate(
      { criterionId: criterion.id, request },
      {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.("edit", message);
        },
      },
    );
  }

  const error = mutation.error;
  const isPending = mutation.isPending;
  const fieldError = (name: string) =>
    isApiError(error) ? error.fieldError(name) : undefined;

  const weightingNumber = Number(form.weighting);
  const weightingIsNumeric = form.weighting.trim() !== "" && !Number.isNaN(weightingNumber);
  const projectedTotal = allocatedElsewhere + (weightingIsNumeric ? weightingNumber : 0);
  // Compared at 2dp, matching the backend's `numeric(5,2)`, so a rubric that genuinely totals
  // 100 never trips this on float noise.
  const projectedRounded = Number(projectedTotal.toFixed(2));

  const incomplete =
    form.label.trim() === "" ||
    form.description.trim() === "" ||
    !weightingIsNumeric ||
    form.maxScore.trim() === "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add criterion" : "Edit criterion"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Something markers give a score against. Added to the end of the rubric."
              : "Change what this criterion asks for, or what it's worth."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          <FormField
            label="Label"
            id="criterion-label"
            name="label"
            required
            autoFocus
            hint="Short name markers see, e.g. 'Critical analysis'."
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            error={fieldError("label")}
          />

          <TextareaField
            label="Description"
            id="criterion-description"
            name="description"
            required
            rows={3}
            hint="What a marker should be looking for. This is the guidance they read while scoring."
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            error={fieldError("description")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Weighting"
              id="criterion-weighting"
              name="weighting"
              type="number"
              min={0}
              max={100}
              step={0.01}
              required
              hint="Percent of the final mark."
              value={form.weighting}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, weighting: event.target.value }))
              }
              error={fieldError("weighting")}
            />

            <FormField
              label="Max score"
              id="criterion-max-score"
              name="maxScore"
              type="number"
              min={1}
              max={1000}
              required
              hint="Highest raw score for this one."
              value={form.maxScore}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, maxScore: event.target.value }))
              }
              error={fieldError("maxScore")}
            />
          </div>

          {/* Advisory only. The backend accepts any total here and doesn't complain until a
              marker tries to start an evaluation (422 RUBRIC_WEIGHTINGS_INVALID), so saying it
              at the moment the number is being chosen is far more useful than after the fact. */}
          {weightingIsNumeric && projectedRounded !== 100 && (
            <Callout variant={projectedRounded > 100 ? "warning" : "info"}>
              {projectedRounded > 100
                ? `That takes the rubric to ${formatPercent(projectedTotal)}, over the 100% markers can be scored against.`
                : `That leaves ${formatPercent(100 - projectedTotal)} of the rubric unallocated. You can save it now and add the rest later.`}
            </Callout>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <SubmitButton
              isPending={isPending}
              pendingLabel="Saving…"
              disabled={incomplete}
              className="sm:w-auto"
            >
              {mode === "create" ? "Add criterion" : "Save changes"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
