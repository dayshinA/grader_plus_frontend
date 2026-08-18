import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { ErrorCard } from "~/components/ui/error-card";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { Skeleton } from "~/components/ui/skeleton";
import { SubmitButton } from "~/components/ui/submit-button";
import { usePermission } from "~/features/auth/api/auth-context";
import { useOfferingDashboard } from "~/features/dashboard/api/use-dashboard";
import { useCloseOffering } from "~/features/grading/api/use-grading";
import { useOfferingHeader } from "~/features/structure/api/use-offering-header";
import { useReopenOffering, useUpdateOffering } from "~/features/structure/api/use-structure";
import { pluralise } from "~/utils/format";
import { isApiError } from "~/lib/api-client";

/** The value a `datetime-local` input wants, in local time rather than UTC. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Deadline, threshold, and the two irreversible acts. Closing is the freeze, and it is
 * warned about plainly rather than being a button that quietly changes what everything
 * else does.
 */
export function OfferingSettingsPage({ offeringId }: { offeringId: string }) {
  const canUpdate = usePermission("offering.update");
  const canClose = usePermission("offering.close");
  const canReopen = usePermission("offering.reopen");

  const { offering, isPending, isError, error, refetch, isFetching } =
    useOfferingHeader(offeringId);
  const { data: dashboard } = useOfferingDashboard(offeringId);
  const update = useUpdateOffering(offeringId);
  const close = useCloseOffering(offeringId);
  const reopen = useReopenOffering(offeringId);

  const [deadline, setDeadline] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  if (isError) {
    return (
      <ErrorCard
        title="Could not load this offering"
        error={error}
        description="A refusal here means your account holds no role covering this offering."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  if (isPending || !offering) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const deadlineValue = deadline ?? toLocalInputValue(offering.markingDeadline);
  const thresholdValue = threshold ?? String(offering.discrepancyThreshold);
  const thresholdNumber = Number(thresholdValue);
  const thresholdValid =
    Number.isFinite(thresholdNumber) && thresholdNumber >= 1 && thresholdNumber <= 100;

  const changed =
    deadlineValue !== toLocalInputValue(offering.markingDeadline) ||
    thresholdValue !== String(offering.discrepancyThreshold);

  const ungraded = dashboard
    ? dashboard.progress.projects - dashboard.progress.excluded - dashboard.progress.graded
    : 0;
  const openCases = dashboard?.progress.openCases ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marking settings</CardTitle>
          <CardDescription>
            The deadline is shown to markers rather than enforced: nothing refuses a write
            because it has passed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (!thresholdValid) return;
              update.mutate(
                {
                  markingDeadline: deadlineValue
                    ? new Date(deadlineValue).toISOString()
                    : undefined,
                  discrepancyThreshold: thresholdNumber,
                },
                {
                  onSuccess: ({ message }) => {
                    toast.success(message || "Offering updated.");
                    setDeadline(null);
                    setThreshold(null);
                  },
                },
              );
            }}
          >
            <FormError error={update.error} />

            <FormField
              label="Marking deadline"
              name="markingDeadline"
              type="datetime-local"
              disabled={!canUpdate || offering.isClosed}
              value={deadlineValue}
              onChange={(event) => setDeadline(event.target.value)}
              error={
                isApiError(update.error) ? update.error.fieldError("markingDeadline") : undefined
              }
            />

            <FormField
              label="Discrepancy threshold"
              name="discrepancyThreshold"
              type="number"
              min={1}
              max={100}
              step={0.5}
              disabled={!canUpdate || offering.isClosed}
              value={thresholdValue}
              onChange={(event) => setThreshold(event.target.value)}
              hint="Percentage points. Two markers further apart than this open a case for you to settle."
              error={
                !thresholdValid
                  ? "Use a number between 1 and 100."
                  : isApiError(update.error)
                    ? update.error.fieldError("discrepancyThreshold")
                    : undefined
              }
            />

            {canUpdate && !offering.isClosed && (
              <SubmitButton
                isPending={update.isPending}
                pendingLabel="Saving"
                disabled={!changed || !thresholdValid}
                className="sm:w-auto"
              >
                Save settings
              </SubmitButton>
            )}
          </form>
        </CardContent>
      </Card>

      {canClose && !offering.isClosed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Close the {offering.academicYear} offering</CardTitle>
            <CardDescription>
              Closing freezes the grades. It is the point after which the record stops moving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {openCases > 0 && (
              <Callout variant="warning" title="Cases are still open">
                {pluralise(openCases, "discrepancy case")} still need settling. Closing with
                those open leaves those projects without a grade.
              </Callout>
            )}
            {ungraded > 0 && (
              <Callout variant="info">
                {pluralise(ungraded, "project has", "projects have")} no final grade yet. Check
                the export preview first: it names every gap with its reason.
              </Callout>
            )}

            <Button
              variant="outline"
              className="h-11 w-full cursor-pointer text-destructive hover:text-destructive sm:h-9 sm:w-auto"
              onClick={() => setConfirmClose(true)}
            >
              <Lock className="size-4" aria-hidden="true" />
              Close offering
            </Button>
          </CardContent>
        </Card>
      )}

      {offering.isClosed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The {offering.academicYear} offering is closed</CardTitle>
            <CardDescription>
              Every write on it is refused. Reopening returns it to marking rather than to
              setup, because an offering that reached closing already has projects and
              assignments on it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canReopen ? (
              <Button
                variant="outline"
                className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
                onClick={() => setConfirmReopen(true)}
              >
                <Unlock className="size-4" aria-hidden="true" />
                Reopen offering
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Reopening is a System Administrator permission. Ask one if something has to
                change on a closed record, and expect to explain why.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title={`Close the ${offering.academicYear} offering?`}
        description="Nothing can be changed afterwards: no marking, no rubric edits, no assignment changes, no grade overrides. Reopening needs a separate permission that most coordinators do not hold, so this is not something you can quietly undo."
        details={
          openCases > 0 || ungraded > 0
            ? `${pluralise(openCases, "case")} still open and ${pluralise(ungraded, "project")} without a grade. Those projects stay ungraded.`
            : undefined
        }
        confirmLabel="Close offering"
        pendingLabel="Closing"
        destructive
        isPending={close.isPending}
        onConfirm={() =>
          close.mutate(undefined, {
            onSuccess: ({ message }) => {
              toast.success(message || "Offering closed.");
              setConfirmClose(false);
            },
          })
        }
      />

      <ConfirmDialog
        open={confirmReopen}
        onOpenChange={setConfirmReopen}
        title={`Reopen the ${offering.academicYear} offering?`}
        description="The offering opens again and marking can continue. This is recorded in the audit log with your name on it."
        confirmLabel="Reopen"
        pendingLabel="Reopening"
        isPending={reopen.isPending}
        onConfirm={() =>
          reopen.mutate(undefined, {
            onSuccess: ({ message }) => {
              toast.success(message || "Offering reopened.");
              setConfirmReopen(false);
            },
          })
        }
      />
    </div>
  );
}
