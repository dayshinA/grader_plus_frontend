import { UserPlus } from "lucide-react";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { FormError } from "~/components/ui/form-error";
import { SelectField } from "~/components/ui/select-field";
import { SubmitButton } from "~/components/ui/submit-button";
import {
  useAssignMarker,
  useMarkerCandidates,
} from "~/features/marker-assignments/api/use-marker-assignments";
import type { AssignmentRole } from "~/features/marker-assignments/types";

/** The backend's own cap, mirrored here so the dialog can explain rather than just fail. */
export const MAX_MARKERS_PER_STUDENT = 5;

interface AssignMarkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  student: { studentId: string; studentCode: string; fullName: string; projectTitle: string };
  /** How many markers this student already has, moderators included. */
  currentCount: number;
  /** Marker ids already on this student — excluded from the picker on top of the backend's own
   * module-wide exclusion, which doesn't know about per-student duplicates. */
  assignedMarkerIds: string[];
  onSuccess?: (apiMessage: string) => void;
}

const ROLE_OPTIONS: { value: AssignmentRole; label: string }[] = [
  { value: "marker", label: "Marker" },
  { value: "moderator", label: "Moderator" },
];

/**
 * Puts one marker on one student.
 *
 * The role choice is `marker` vs `moderator`, which is a property of *this row* and nothing more —
 * a moderator is not a distinct role, holds no extra permission, and grades blind exactly like any
 * other marker. It counts toward the same cap.
 *
 * Remounted by its caller via a changing `key` rather than resetting itself in an effect.
 */
export function AssignMarkerDialog({
  open,
  onOpenChange,
  moduleId,
  student,
  currentCount,
  assignedMarkerIds,
  onSuccess,
}: AssignMarkerDialogProps) {
  const [markerId, setMarkerId] = useState("");
  const [role, setRole] = useState<AssignmentRole>("marker");

  const { data, isLoading } = useMarkerCandidates(moduleId);
  const assignMarker = useAssignMarker(moduleId);

  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  // The endpoint already drops anyone assigned anywhere on this module, but a marker can be on
  // student A and legitimately assignable to student B — so that server-side filter is broader
  // than this dialog needs, and the per-student exclusion below is the one that matters.
  const candidates = (data ?? []).filter(
    (candidate) => !assignedMarkerIds.includes(candidate.id),
  );

  const atCapacity = currentCount >= MAX_MARKERS_PER_STUDENT;
  const noCandidates = !isLoading && candidates.length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!markerId) return;

    assignMarker.mutate(
      { studentId: student.studentId, request: { markerId, assignmentRole: role } },
      {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.(message);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setDialogNode}>
        <DialogHeader>
          <DialogTitle>Assign a marker</DialogTitle>
          <DialogDescription>
            {student.fullName} · {student.studentCode}
          </DialogDescription>
        </DialogHeader>

        {atCapacity ? (
          <>
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserPlus aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Already at five markers</EmptyTitle>
                <EmptyDescription>
                  A project takes at most {MAX_MARKERS_PER_STUDENT} markers, moderators included.
                  Remove one before adding another.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 cursor-pointer sm:h-9"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </>
        ) : noCandidates ? (
          <>
            <Empty className="px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserPlus aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No markers available</EmptyTitle>
                <EmptyDescription>
                  Everyone holding a Marker role is either already on this student or not
                  available to this module. Create a Marker account from the Users screen, or grant
                  the Marker role to an existing user from Role Assignments.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 cursor-pointer sm:h-9"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormError error={assignMarker.error} />

            <SelectField
              label="Marker"
              id="assign-marker"
              value={markerId}
              onValueChange={setMarkerId}
              options={candidates.map((candidate) => ({
                value: candidate.id,
                label: `${candidate.fullName} (${candidate.email})`,
              }))}
              placeholder={isLoading ? "Loading markers…" : "Select a marker"}
              disabled={isLoading}
              container={dialogNode}
              emptyText="No markers available."
            />

            <SelectField
              label="Role on this project"
              id="assign-role"
              value={role}
              onValueChange={(value) => setRole(value as AssignmentRole)}
              options={ROLE_OPTIONS}
              container={dialogNode}
              hint="A moderator marks blind exactly like anyone else — it's a label on this assignment, not a different kind of account."
            />

            <Callout variant="info">
              {currentCount} of {MAX_MARKERS_PER_STUDENT} marker
              {currentCount === 1 ? "" : "s"} assigned to this project so far. You can&apos;t
              assign yourself — a module&apos;s coordinator never marks their own students.
            </Callout>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 cursor-pointer sm:h-9"
                onClick={() => onOpenChange(false)}
                disabled={assignMarker.isPending}
              >
                Cancel
              </Button>
              <SubmitButton
                isPending={assignMarker.isPending}
                pendingLabel="Assigning…"
                disabled={!markerId}
                className="sm:w-auto"
              >
                Assign marker
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
