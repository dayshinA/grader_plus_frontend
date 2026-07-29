import { useState, type FormEvent } from "react";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useGrantSchoolAdmin } from "~/features/school-admin-grants/api/use-grant-school-admin";
import type { SchoolAdminGrantResponse } from "~/features/school-admin-grants/types";
import type { UserResponse } from "~/features/users/types";
import { ApiError } from "~/lib/api-client";

interface AssignSchoolAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolName: string;
  /** Active coordinators with no existing grant row (active or revoked) for this school — a
   * previously revoked coordinator already has a row of their own, with its own Re-grant
   * action, so isn't offered here again. Always the Super Admin viewer's full `UserResponse[]`
   * — School Admin assignment is never delegable, so there's no lighter Coordinator-viewer
   * variant to support here (unlike `AssignDepartmentAdminDialog`, decision #38). */
  eligibleCoordinators: UserResponse[];
  /** Called after a successful grant, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (grant: SchoolAdminGrantResponse, apiMessage: string) => void;
}

/**
 * Note: this component is remounted by its caller (via a `key` that changes every time the
 * dialog is opened) rather than resetting its own state in an effect — same convention as
 * `AssignDepartmentAdminDialog`.
 */
export function AssignSchoolAdminDialog({
  open,
  onOpenChange,
  schoolId,
  schoolName,
  eligibleCoordinators,
  onSuccess,
}: AssignSchoolAdminDialogProps) {
  const [coordinatorId, setCoordinatorId] = useState("");
  const grantSchoolAdmin = useGrantSchoolAdmin();

  // Passed to the nested Select below as its portal container — see
  // SelectContentProps.container's doc comment for why this is needed
  // (Dialog's focus-trap vs. a document.body-portaled Select popover).
  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coordinatorId) return;

    grantSchoolAdmin.mutate(
      { schoolId, coordinatorId },
      {
        onSuccess: ({ data: grant, message }) => {
          onOpenChange(false);
          onSuccess?.(grant, message);
        },
      },
    );
  }

  const error = grantSchoolAdmin.error;
  const isPending = grantSchoolAdmin.isPending;
  const hasEligibleCoordinators = eligibleCoordinators.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setDialogNode}>
        <DialogHeader>
          <DialogTitle>Assign School Admin</DialogTitle>
          <DialogDescription>
            Grant a Coordinator oversight of every department and module in {schoolName}.
          </DialogDescription>
        </DialogHeader>

        {!hasEligibleCoordinators ? (
          <>
            <Alert
              variant="inline"
              status="info"
              timeout={0}
              title="No eligible coordinators"
              message="Every active coordinator already has a grant record for this school."
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {error && (
              <Alert
                variant="inline"
                status="error"
                timeout={0}
                title="Couldn't assign School Admin"
                message={
                  error instanceof ApiError ? error.message : "Something went wrong. Please try again."
                }
              />
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-school-coordinator">Coordinator</Label>
                <Select value={coordinatorId} onValueChange={setCoordinatorId}>
                  <SelectTrigger id="assign-school-coordinator">
                    <SelectValue placeholder="Select a coordinator" />
                  </SelectTrigger>
                  <SelectContent container={dialogNode}>
                    {eligibleCoordinators.map((coordinator) => (
                      <SelectItem key={coordinator.id} value={coordinator.id}>
                        {coordinator.fullName} ({coordinator.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !coordinatorId} data-loading={isPending}>
                  {isPending ? "Assigning..." : "Assign"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
