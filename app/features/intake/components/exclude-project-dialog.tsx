import { useState } from "react";
import { toast } from "sonner";

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
import { SubmitButton } from "~/components/ui/submit-button";
import { TextareaField } from "~/components/ui/textarea-field";
import { useExcludeProject } from "~/features/intake/api/use-intake";
import type { Project } from "~/features/intake/types";
import { isApiError } from "~/lib/api-client";

const MINIMUM_REASON = 5;

/**
 * Excluding is a coordinator saying this student's work can never be graded, so it is
 * confirmed properly and the reason stays on the record. It is reversible, but the reason
 * is not a formality.
 */
export function ExcludeProjectDialog({
  open,
  onOpenChange,
  offeringId,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
  project: Project;
}) {
  const exclude = useExcludeProject(offeringId);
  const [reason, setReason] = useState("");

  const error = exclude.error;
  const tooShort = reason.trim().length > 0 && reason.trim().length < MINIMUM_REASON;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exclude {project.studentNameSnapshot}&apos;s project?</DialogTitle>
          <DialogDescription>
            An excluded project stops counting toward whether this offering can close, and it
            never receives a grade. Nothing is deleted.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim().length < MINIMUM_REASON) return;
            exclude.mutate(
              { projectId: project.id, payload: { reason: reason.trim() } },
              {
                onSuccess: ({ message }) => {
                  toast.success(message || "Project excluded.");
                  onOpenChange(false);
                },
              },
            );
          }}
        >
          <FormError error={error} />

          <Callout variant="warning">
            A withdrawal after submission is the usual reason. If the work is simply late or
            unmarked, leave the project in place instead.
          </Callout>

          <TextareaField
            label="Reason"
            name="reason"
            required
            autoFocus
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint={`At least ${MINIMUM_REASON} characters. This stays on the record.`}
            error={
              tooShort
                ? `Say a bit more than that: at least ${MINIMUM_REASON} characters.`
                : isApiError(error)
                  ? error.fieldError("reason")
                  : undefined
            }
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <SubmitButton
              isPending={exclude.isPending}
              pendingLabel="Excluding"
              disabled={reason.trim().length < MINIMUM_REASON}
              className="sm:w-auto"
            >
              Exclude project
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
