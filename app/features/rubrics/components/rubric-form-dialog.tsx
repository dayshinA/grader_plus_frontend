import { useState, type FormEvent } from "react";

import { Button } from "~/components/ui/button";
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
import {
  useCreateRubric,
  useUpdateRubric,
} from "~/features/rubrics/api/use-rubric-mutations";
import type { RubricResponse } from "~/features/rubrics/types";
import { isApiError } from "~/lib/api-client";

interface RubricFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  moduleId: string;
  /** Required in "edit" mode — the rubric whose title is being changed. */
  rubric?: RubricResponse;
  /** Fires after the request succeeds and the dialog has closed. `apiMessage` is the backend's
   * own confirmation (decision #31). */
  onSuccess?: (mode: "create" | "edit", apiMessage: string) => void;
}

/**
 * The rubric *shell* — its title, and nothing else. That's the whole editable surface of
 * `POST`/`PATCH .../rubric`; criteria are separate resources with their own routes, and
 * `CriterionFormDialog` handles those.
 *
 * Remounted by its caller via a changing `key` rather than resetting itself in an effect — the
 * same convention as `ModuleFormDialog` and `DepartmentFormDialog`.
 */
export function RubricFormDialog({
  open,
  onOpenChange,
  mode,
  moduleId,
  rubric,
  onSuccess,
}: RubricFormDialogProps) {
  const [title, setTitle] = useState(() => (mode === "edit" ? (rubric?.title ?? "") : ""));

  const createRubric = useCreateRubric(moduleId);
  const updateRubric = useUpdateRubric(moduleId);
  const mutation = mode === "create" ? createRubric : updateRubric;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    mutation.mutate(
      { title: trimmed },
      {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.(mode, message);
        },
      },
    );
  }

  const error = mutation.error;
  const isPending = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create rubric" : "Rename rubric"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Every module gets one rubric. Name it now — you'll add the criteria markers score against next."
              : "Change what this rubric is called. Its criteria aren't affected."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          <FormField
            label="Title"
            id="rubric-title"
            name="title"
            required
            autoFocus
            hint="What this rubric is for, e.g. 'MSc Dissertation 2026'."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={isApiError(error) ? error.fieldError("title") : undefined}
          />

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
              disabled={title.trim() === ""}
              className="sm:w-auto"
            >
              {mode === "create" ? "Create rubric" : "Save changes"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
