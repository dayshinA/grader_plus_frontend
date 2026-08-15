import { useState } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Callout } from "~/components/ui/callout";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ErrorCard } from "~/components/ui/error-card";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { assignmentsService } from "~/features/assignments/api/assignments.service";
import {
  useEligibleMarkers,
  useProposeAuto,
} from "~/features/assignments/api/use-assignments";
import { ASSIGNMENT_ROLE_LABELS, type AutoAssignPreview } from "~/features/assignments/types";
import { pluralise } from "~/utils/format";

/**
 * The auto route proposes and does not write, so this is a two step screen: pick the pool,
 * read the proposal, then apply it. Applying is a series of ordinary create calls, which is
 * why a partial apply is reported rather than hidden.
 */
export function AutoAssignDialog({
  open,
  onOpenChange,
  offeringId,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
  onApplied: () => void;
}) {
  const { data: markers, isPending, isError, error, refetch } = useEligibleMarkers(offeringId);
  const propose = useProposeAuto(offeringId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [maxPerMarker, setMaxPerMarker] = useState("");
  const [preview, setPreview] = useState<AutoAssignPreview | undefined>();
  const [applying, setApplying] = useState(false);

  async function apply(proposal: AutoAssignPreview) {
    setApplying(true);
    let created = 0;
    const failures: string[] = [];

    for (const row of proposal.proposed) {
      try {
        await assignmentsService.create(offeringId, {
          projectId: row.projectId,
          markerId: row.markerId,
          assignmentRole: row.assignmentRole,
        });
        created += 1;
      } catch (assignError) {
        failures.push(
          `${row.studentName} to ${row.markerName}: ${
            assignError instanceof Error ? assignError.message : "refused"
          }`,
        );
      }
    }

    setApplying(false);
    onApplied();

    if (failures.length === 0) {
      toast.success(`${pluralise(created, "assignment")} created.`);
      onOpenChange(false);
    } else {
      toast.error(
        `${pluralise(created, "assignment")} created, ${failures.length} refused. ${failures[0]}`,
      );
    }
  }

  if (preview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proposed allocation</DialogTitle>
            <DialogDescription>
              Nothing has been saved yet. Read it, then apply it or go back and change the
              pool.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            {preview.perMarker.map((row) => (
              <div key={row.markerId} className="rounded-lg border border-border p-3">
                <p className="truncate text-sm font-medium">{row.markerName}</p>
                <p className="text-xs text-muted-foreground">
                  {pluralise(row.projects, "project")}
                </p>
              </div>
            ))}
          </div>

          {preview.skipped.length > 0 && (
            <Callout variant="info" title={`${pluralise(preview.skipped.length, "project")} skipped`}>
              <ul className="mt-1 space-y-0.5">
                {preview.skipped.slice(0, 8).map((row) => (
                  <li key={row.projectId} className="truncate text-xs">
                    {row.studentName}: {row.reason}
                  </li>
                ))}
              </ul>
            </Callout>
          )}

          <ScrollArea className="h-64 rounded-lg border border-border">
            <ul className="divide-y divide-border">
              {preview.proposed.map((row, index) => (
                <li
                  key={`${row.projectId}-${row.markerId}-${index}`}
                  className="flex items-center justify-between gap-3 p-2.5"
                >
                  <span className="min-w-0 truncate text-sm">{row.studentName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.markerName} · {ASSIGNMENT_ROLE_LABELS[row.assignmentRole]}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer sm:h-9"
              disabled={applying}
              onClick={() => setPreview(undefined)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-11 cursor-pointer sm:h-9"
              disabled={applying || preview.proposed.length === 0}
              aria-busy={applying}
              onClick={() => void apply(preview)}
            >
              {applying
                ? "Applying"
                : `Apply ${pluralise(preview.proposed.length, "assignment")}`}
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
          <DialogTitle>Propose an allocation</DialogTitle>
          <DialogDescription>
            Two markers per project, spread evenly across the pool. Projects that already have
            markers are left alone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError error={propose.error} />

          {isError ? (
            <ErrorCard title="Could not load markers" error={error} onRetry={() => void refetch()} />
          ) : isPending ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : (markers ?? []).length < 2 ? (
            <Callout variant="warning" title="Not enough markers">
              At least two people need the marker role on this offering before an allocation
              can be proposed. Grant it from the accounts screen.
            </Callout>
          ) : (
            <>
              <ScrollArea className="h-56 rounded-lg border border-border">
                <div className="divide-y divide-border">
                  {(markers ?? []).map((marker) => {
                    const id = `pool-${marker.id}`;
                    return (
                      <label
                        key={marker.id}
                        htmlFor={id}
                        className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-accent/50"
                      >
                        <Checkbox
                          id={id}
                          className="mt-0.5"
                          checked={selected.has(marker.id)}
                          onCheckedChange={(value) => {
                            const next = new Set(selected);
                            if (value === true) next.add(marker.id);
                            else next.delete(marker.id);
                            setSelected(next);
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {marker.fullName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {marker.email}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>

              <FormField
                label="Cap per marker"
                name="maxPerMarker"
                type="number"
                min={1}
                value={maxPerMarker}
                onChange={(event) => setMaxPerMarker(event.target.value)}
                hint="Leave blank for an even split across the pool."
              />
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 cursor-pointer sm:h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 cursor-pointer sm:h-9"
            disabled={selected.size < 2 || propose.isPending}
            aria-busy={propose.isPending}
            onClick={() =>
              propose.mutate(
                {
                  markerIds: [...selected],
                  maxPerMarker: maxPerMarker ? Number(maxPerMarker) : undefined,
                },
                { onSuccess: setPreview },
              )
            }
          >
            <Wand2 className="size-4" aria-hidden="true" />
            {propose.isPending ? "Proposing" : "Propose"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
