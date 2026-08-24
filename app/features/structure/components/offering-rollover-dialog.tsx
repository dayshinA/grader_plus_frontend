import { useState } from "react";
import { toast } from "sonner";

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
import { ImportReportView } from "~/components/ui/import-report-view";
import { SubmitButton } from "~/components/ui/submit-button";
import { useRolloverOfferings } from "~/features/structure/api/use-structure";
import { isApiError } from "~/lib/api-client";
import type { ImportReport } from "~/types/import-report";

/** The 422 says the same thing, but a typo is cheaper to catch before the request. */
const YEAR_PATTERN = /^\d{4}\/\d{2}$/;

// Not an upload: the system knows which modules ran last year, so the form is the year pair.
export function OfferingRolloverDialog({
  open,
  onOpenChange,
  unitId,
  unitName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitName: string;
}) {
  const rollover = useRolloverOfferings(unitId);

  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [localErrors, setLocalErrors] = useState<{ fromYear?: string; toYear?: string }>({});
  const [preview, setPreview] = useState<ImportReport | undefined>();
  const [applied, setApplied] = useState<ImportReport | undefined>();

  const error = rollover.error;
  const fieldError = (field: string) =>
    localErrors[field as keyof typeof localErrors] ??
    (isApiError(error) ? error.fieldError(field) : undefined);

  function validate(): boolean {
    const next: typeof localErrors = {};
    if (!YEAR_PATTERN.test(fromYear.trim())) next.fromYear = "Use the form 2025/26.";
    if (!YEAR_PATTERN.test(toYear.trim())) next.toYear = "Use the form 2025/26.";
    setLocalErrors(next);
    return !next.fromYear && !next.toYear;
  }

  function run(dryRun: boolean) {
    rollover.mutate(
      { fromYear: fromYear.trim(), toYear: toYear.trim(), dryRun },
      {
        onSuccess: ({ data, message }) => {
          if (dryRun) {
            setPreview(data);
          } else {
            setPreview(undefined);
            setApplied(data);
            toast.success(message || "Offerings rolled forward.");
          }
        },
      },
    );
  }

  if (applied) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rollover finished</DialogTitle>
            <DialogDescription>
              The new offerings open in setup with the discrepancy threshold and marker cap
              carried forward. Deadlines never carry over, so set each new year&apos;s
              deadline on its offering.
            </DialogDescription>
          </DialogHeader>

          <ImportReportView report={applied} />

          <DialogFooter>
            <Button className="h-11 cursor-pointer sm:h-9" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (preview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Roll {fromYear.trim()} forward to {toYear.trim()}
            </DialogTitle>
            <DialogDescription>
              One row per active module. A module already open for the new year, or one that
              did not run in the old one, is left alone, and the message on each row says
              which.
            </DialogDescription>
          </DialogHeader>

          <FormError error={error} />

          <ImportReportView report={preview} />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              disabled={rollover.isPending}
              onClick={() => setPreview(undefined)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-11 cursor-pointer sm:h-9"
              disabled={rollover.isPending}
              aria-busy={rollover.isPending}
              onClick={() => run(false)}
            >
              {rollover.isPending ? "Applying" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Roll offerings forward</DialogTitle>
          <DialogDescription>
            Every active module under {unitName} that ran in the old year and has no offering
            for the new one gets one, opened in setup. The discrepancy threshold and marker
            cap carry forward; the marking deadline never does.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (validate()) run(true);
          }}
        >
          <FormError error={error} />

          <FormField
            label="From year"
            name="fromYear"
            required
            autoFocus
            value={fromYear}
            onChange={(event) => setFromYear(event.target.value)}
            placeholder="2025/26"
            error={fieldError("fromYear")}
          />

          <FormField
            label="To year"
            name="toYear"
            required
            value={toYear}
            onChange={(event) => setToYear(event.target.value)}
            placeholder="2026/27"
            hint="Only modules that ran in the old year are carried over. A module returning after a gap needs its offering created by hand."
            error={fieldError("toYear")}
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
              isPending={rollover.isPending}
              pendingLabel="Checking"
              disabled={!fromYear.trim() || !toYear.trim()}
              className="sm:w-auto"
            >
              Preview
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
