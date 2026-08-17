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
import { SelectField } from "~/components/ui/select-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { useCreateOffering } from "~/features/structure/api/use-structure";
import type { ProjectModule } from "~/features/structure/types";
import { isApiError } from "~/lib/api-client";

/** The next few academic years, so nobody has to remember the 2025/26 shape. */
function academicYearOptions(): { value: string; label: string }[] {
  const now = new Date();
  // The academic year turns over in August rather than in January.
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return [-1, 0, 1, 2].map((offset) => {
    const first = startYear + offset;
    const value = `${first}/${String((first + 1) % 100).padStart(2, "0")}`;
    return { value, label: value };
  });
}

const MARKER_COUNT_OPTIONS = [2, 3, 4, 5].map((count) => ({
  value: String(count),
  label: `${count} markers`,
}));

/**
 * A new academic year of an existing module. Nothing is copied from last year, the rubric
 * included: copying a rubric is a separate, deliberate action on the rubric screen.
 */
export function OfferingFormDialog({
  open,
  onOpenChange,
  module,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ProjectModule;
}) {
  const create = useCreateOffering(module.id);
  const years = academicYearOptions();

  const [academicYear, setAcademicYear] = useState(years[1]?.value ?? years[0].value);
  const [markingDeadline, setMarkingDeadline] = useState("");
  const [discrepancyThreshold, setDiscrepancyThreshold] = useState("10");
  const [maxMarkers, setMaxMarkers] = useState("2");

  const error = create.error;
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined);

  const threshold = Number(discrepancyThreshold);
  const thresholdValid = Number.isFinite(threshold) && threshold >= 1 && threshold <= 100;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thresholdValid) return;

    create.mutate(
      {
        academicYear,
        markingDeadline: markingDeadline ? new Date(markingDeadline).toISOString() : undefined,
        discrepancyThreshold: threshold,
        maxMarkersPerProject: Number(maxMarkers),
      },
      {
        onSuccess: ({ message }) => {
          toast.success(message || "Offering created.");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New offering of {module.code}</DialogTitle>
          <DialogDescription>
            One academic year of this module. It starts in setup, with no projects, no rubric
            and no assignments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError error={error} />

          <SelectField
            label="Academic year"
            value={academicYear}
            onValueChange={setAcademicYear}
            options={years}
            error={fieldError("academicYear")}
          />

          <FormField
            label="Marking deadline"
            name="markingDeadline"
            type="datetime-local"
            value={markingDeadline}
            onChange={(event) => setMarkingDeadline(event.target.value)}
            hint="Optional now, and editable later. It is shown to markers, not enforced."
            error={fieldError("markingDeadline")}
          />

          <FormField
            label="Discrepancy threshold"
            name="discrepancyThreshold"
            type="number"
            min={1}
            max={100}
            step={0.5}
            required
            value={discrepancyThreshold}
            onChange={(event) => setDiscrepancyThreshold(event.target.value)}
            hint="Percentage points. Two markers further apart than this opens a case."
            error={
              discrepancyThreshold !== "" && !thresholdValid
                ? "Use a number between 1 and 100."
                : fieldError("discrepancyThreshold")
            }
          />

          <SelectField
            label="Maximum markers per project"
            value={maxMarkers}
            onValueChange={setMaxMarkers}
            options={MARKER_COUNT_OPTIONS}
            error={fieldError("maxMarkersPerProject")}
          />

          <Callout variant="warning" title="This one is fixed at creation">
            The maximum number of markers cannot be changed once the offering exists. Two is
            the minimum in every case.
          </Callout>

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
              isPending={create.isPending}
              pendingLabel="Creating"
              disabled={!thresholdValid}
              className="sm:w-auto"
            >
              Create offering
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
