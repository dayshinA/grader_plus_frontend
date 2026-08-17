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
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { TextareaField } from "~/components/ui/textarea-field";
import { useOverrideGrade } from "~/features/grading/api/use-grading";
import type { OfferingGradeRow } from "~/features/grading/types";
import { isApiError } from "~/lib/api-client";

const MINIMUM_REASON = 10;

/**
 * The exceptional path, for a project that cannot complete the normal workflow, a marker
 * becoming permanently unavailable being the usual case. It is never the way to settle an
 * ordinary disagreement, and it is worded that way because the server refuses it outright
 * while a discrepancy is open.
 */
export function OverrideGradeDialog({
  open,
  onOpenChange,
  offeringId,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
  project: OfferingGradeRow;
}) {
  const override = useOverrideGrade(offeringId);
  const [mark, setMark] = useState(project.mark === null ? "" : String(project.mark));
  const [reason, setReason] = useState("");

  const markNumber = Number(mark);
  const markValid = mark !== "" && Number.isFinite(markNumber) && markNumber >= 0 && markNumber <= 100;
  const reasonValid = reason.trim().length >= MINIMUM_REASON;

  const error = override.error;
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Override {project.studentName}&apos;s grade</DialogTitle>
          <DialogDescription>
            This writes a final grade without the normal two marker route. It is recorded as an
            exceptional override with your name and your reason on it.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!markValid || !reasonValid) return;
            override.mutate(
              { projectId: project.projectId, payload: { mark: markNumber, reason: reason.trim() } },
              {
                onSuccess: ({ message }) => {
                  toast.success(message || "Grade overridden.");
                  onOpenChange(false);
                },
              },
            );
          }}
        >
          <FormError error={error} />

          <Callout variant="warning" title="This is not how a disagreement is settled">
            If two markers disagree, there is a discrepancy case for that, and settling it
            there records the disagreement properly. Use this only when that normal process
            cannot finish at all.
          </Callout>

          <FormField
            label="Final mark"
            name="mark"
            type="number"
            min={0}
            max={100}
            step={0.01}
            required
            autoFocus
            value={mark}
            onChange={(event) => setMark(event.target.value)}
            error={
              mark !== "" && !markValid ? "Use a number between 0 and 100." : fieldError("mark")
            }
          />

          <TextareaField
            label="Reason"
            name="reason"
            rows={4}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            hint={`At least ${MINIMUM_REASON} characters. This goes on the permanent record.`}
            error={
              reason.trim().length > 0 && !reasonValid
                ? `Say a bit more than that: at least ${MINIMUM_REASON} characters.`
                : fieldError("reason")
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
              isPending={override.isPending}
              pendingLabel="Saving"
              disabled={!markValid || !reasonValid}
              className="sm:w-auto"
            >
              Override grade
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
