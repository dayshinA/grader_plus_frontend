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
import { useResolveDiscrepancy } from "~/features/discrepancy/api/use-discrepancy-cases";
import type { DiscrepancyCaseSummary } from "~/features/discrepancy/types";
import { isApiError } from "~/lib/api-client";

interface ResolveDiscrepancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  discrepancyCase: DiscrepancyCaseSummary;
  onSuccess?: (apiMessage: string) => void;
}

/** Two decimals only when they carry information — 67 rather than 67.00. */
function formatScore(value: number): string {
  return String(Number(value.toFixed(2)));
}

/**
 * Settles a flagged case with an agreed mark.
 *
 * This is a one-way door and the copy says so: resolving writes the `final_grades` row and
 * **permanently locks** the student, so later score edits by any marker stop recomputing anything.
 * There is no un-resolve route in the API.
 *
 * The high and the low are shown, and **not** which marker gave which — the backend doesn't send
 * that and mustn't. Blind isolation survives the flag.
 *
 * Remounted by its caller via a changing `key` rather than resetting itself in an effect.
 */
export function ResolveDiscrepancyDialog({
  open,
  onOpenChange,
  moduleId,
  discrepancyCase,
  onSuccess,
}: ResolveDiscrepancyDialogProps) {
  const [agreedMark, setAgreedMark] = useState("");
  const resolve = useResolveDiscrepancy(moduleId);

  const markNumber = Number(agreedMark);
  const isNumeric = agreedMark.trim() !== "" && !Number.isNaN(markNumber);
  const inRange = isNumeric && markNumber >= 0 && markNumber <= 100;
  // Advisory only — the backend accepts anything 0-100, and a coordinator may legitimately settle
  // outside the two marks after a moderation conversation.
  const outsideSpread =
    isNumeric &&
    (markNumber > discrepancyCase.scoreHigh || markNumber < discrepancyCase.scoreLow);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inRange) return;

    resolve.mutate(
      { caseId: discrepancyCase.id, agreedMark: markNumber },
      {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.(message);
        },
      },
    );
  }

  const error = resolve.error;
  // Matched on the exact code rather than "any 422": validation failures on `agreedMark` arrive
  // as 422s too, and treating one of those as "someone else resolved it" would be a lie that
  // also disables the submit button.
  const alreadyResolved =
    isApiError(error) && error.code === "DISCREPANCY_CASE_ALREADY_RESOLVED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve discrepancy</DialogTitle>
          <DialogDescription>
            {discrepancyCase.studentFullName} · {discrepancyCase.studentToken}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!alreadyResolved && <FormError error={error} />}

          {alreadyResolved && (
            <Callout variant="warning" title="Already resolved">
              Someone settled this case while you had it open. Close this dialog and refresh to see
              the mark that was recorded.
            </Callout>
          )}

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border p-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Highest</p>
              <p className="text-lg tabular-nums text-foreground">
                {formatScore(discrepancyCase.scoreHigh)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lowest</p>
              <p className="text-lg tabular-nums text-foreground">
                {formatScore(discrepancyCase.scoreLow)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gap</p>
              <p className="text-lg tabular-nums text-foreground">
                {formatScore(discrepancyCase.scoreHigh - discrepancyCase.scoreLow)}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Which marker gave which isn&apos;t shown, here or anywhere else — marking stays blind
            even after a case is flagged.
          </p>

          <FormField
            label="Agreed mark"
            id="agreed-mark"
            name="agreedMark"
            type="number"
            min={0}
            max={100}
            step={0.01}
            required
            autoFocus
            hint="The final mark for this project, 0-100."
            value={agreedMark}
            onChange={(event) => setAgreedMark(event.target.value)}
            error={isApiError(error) ? error.fieldError("agreedMark") : undefined}
          />

          {outsideSpread && (
            <Callout variant="info">
              That&apos;s outside the range the markers gave ({formatScore(discrepancyCase.scoreLow)}{" "}
              to {formatScore(discrepancyCase.scoreHigh)}). Allowed, but worth a second look.
            </Callout>
          )}

          <Callout variant="warning" title="This can't be undone">
            Recording the mark writes {discrepancyCase.studentFullName}&apos;s final grade and
            permanently locks the project. Any later score change by a marker will no longer affect
            it, and there&apos;s no way to reopen the case.
          </Callout>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 cursor-pointer sm:h-9"
              onClick={() => onOpenChange(false)}
              disabled={resolve.isPending}
            >
              Cancel
            </Button>
            <SubmitButton
              isPending={resolve.isPending}
              pendingLabel="Recording…"
              disabled={!inRange || alreadyResolved}
              className="sm:w-auto"
            >
              Record agreed mark
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
