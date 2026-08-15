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
import { SelectField } from "~/components/ui/select-field";
import { SubmitButton } from "~/components/ui/submit-button";
import {
  useCreateAssignment,
  useEligibleMarkers,
} from "~/features/assignments/api/use-assignments";
import {
  ASSIGNMENT_ROLE_LABELS,
  ASSIGNMENT_ROLES,
  type AssignmentRole,
  type MarkerAssignment,
} from "~/features/assignments/types";
import type { Project } from "~/features/intake/types";
import { isApiError } from "~/lib/api-client";

/**
 * One first marker, one second marker and one moderator at most.
 * `additional_marker` is the unconstrained value for a fourth or fifth opinion, so it is
 * the only one that stays available once taken.
 */
function availableRoles(existing: MarkerAssignment[]): AssignmentRole[] {
  const taken = new Set(existing.map((assignment) => assignment.assignmentRole));
  return ASSIGNMENT_ROLES.filter(
    (role) => role === "additional_marker" || !taken.has(role),
  );
}

export function AssignMarkerDialog({
  open,
  onOpenChange,
  offeringId,
  project,
  existing,
  maxMarkers = 5,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
  project: Project;
  /** The assignments already on this project, to narrow the role options. */
  existing: MarkerAssignment[];
  maxMarkers?: number;
}) {
  const { data: markers, isPending } = useEligibleMarkers(offeringId);
  const create = useCreateAssignment(offeringId);

  const roles = availableRoles(existing);
  const [markerId, setMarkerId] = useState("");
  const [role, setRole] = useState<AssignmentRole>(roles[0] ?? "additional_marker");

  const assignedIds = new Set(existing.map((assignment) => assignment.markerId));
  // The coordinator is already filtered out server side: they cannot mark their own offering.
  const options = (markers ?? [])
    .filter((marker) => !assignedIds.has(marker.id))
    .map((marker) => ({ value: marker.id, label: `${marker.fullName} · ${marker.email}` }));

  const atCapacity = existing.length >= maxMarkers;
  const error = create.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a marker to {project.studentNameSnapshot}</DialogTitle>
          <DialogDescription>
            Two markers minimum, {maxMarkers} maximum. They mark blind of each other, whatever
            role they hold on the project.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!markerId) return;
            create.mutate(
              { projectId: project.id, markerId, assignmentRole: role },
              {
                onSuccess: ({ message }) => {
                  toast.success(message || "Marker assigned.");
                  onOpenChange(false);
                },
              },
            );
          }}
        >
          <FormError error={error} />

          {atCapacity && (
            <Callout variant="warning" title="This project is at capacity">
              It already has {existing.length} markers, which is the maximum this offering was
              created with. Remove one before adding another.
            </Callout>
          )}

          <SelectField
            label="Marker"
            value={markerId}
            onValueChange={setMarkerId}
            options={options}
            placeholder={isPending ? "Loading" : "Choose a marker"}
            emptyText="Nobody else holds the marker role on this offering. Grant it first, from the accounts screen."
            hint="Only people holding marker on this offering appear here, and never its coordinator."
            error={isApiError(error) ? error.fieldError("markerId") : undefined}
          />

          <SelectField
            label="Role on this project"
            value={role}
            onValueChange={(value) => setRole(value as AssignmentRole)}
            options={roles.map((value) => ({
              value,
              label: ASSIGNMENT_ROLE_LABELS[value],
            }))}
            hint="Moderator is a value on the assignment, not a role in the permission system. They mark blind like everyone else."
            error={isApiError(error) ? error.fieldError("assignmentRole") : undefined}
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
              isPending={create.isPending}
              pendingLabel="Assigning"
              disabled={!markerId || atCapacity}
              className="sm:w-auto"
            >
              Assign marker
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
