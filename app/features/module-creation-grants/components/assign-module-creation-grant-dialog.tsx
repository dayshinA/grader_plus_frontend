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
import { useGrantModuleCreation } from "~/features/module-creation-grants/api/use-grant-module-creation";
import type { ModuleCreationGrantResponse } from "~/features/module-creation-grants/types";
import type { UserResponse } from "~/features/users/types";
import { ApiError } from "~/lib/api-client";

export interface EligibleCoordinatorOption {
  id: string;
  label: string;
}

interface AssignModuleCreationGrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  departmentName: string;
  /** Coordinators with no existing active grant row for this department — a previously revoked
   * coordinator already has a row of their own, with its own Re-grant action, so isn't offered
   * here again. Accepts either the Super Admin viewer's full `UserResponse[]` (name + email
   * available) or the Coordinator/Department-Admin viewer's lighter `EligibleCoordinatorOption[]`
   * (from `GET /departments/:departmentId/coordinators`, id + label only). */
  eligibleCoordinators: UserResponse[] | EligibleCoordinatorOption[];
  /** Called after a successful grant, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (grant: ModuleCreationGrantResponse, apiMessage: string) => void;
}

function toOption(
  coordinator: UserResponse | EligibleCoordinatorOption,
): EligibleCoordinatorOption {
  if ("label" in coordinator) return coordinator;
  return { id: coordinator.id, label: `${coordinator.fullName} (${coordinator.email})` };
}

/**
 * Note: this component is remounted by its caller (via a `key` that changes every time the
 * dialog is opened) rather than resetting its own state in an effect — same convention as
 * `AssignDepartmentAdminDialog`.
 */
export function AssignModuleCreationGrantDialog({
  open,
  onOpenChange,
  departmentId,
  departmentName,
  eligibleCoordinators,
  onSuccess,
}: AssignModuleCreationGrantDialogProps) {
  const [coordinatorId, setCoordinatorId] = useState("");
  const grantModuleCreation = useGrantModuleCreation();

  // Passed to the nested Select below as its portal container — see
  // SelectContentProps.container's doc comment for why this is needed (Dialog's focus-trap vs.
  // a document.body-portaled Select popover).
  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  const options = eligibleCoordinators.map(toOption);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coordinatorId) return;

    grantModuleCreation.mutate(
      { departmentId, coordinatorId },
      {
        onSuccess: ({ data: grant, message }) => {
          onOpenChange(false);
          onSuccess?.(grant, message);
        },
      },
    );
  }

  const error = grantModuleCreation.error;
  const isPending = grantModuleCreation.isPending;
  const hasEligibleCoordinators = options.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setDialogNode}>
        <DialogHeader>
          <DialogTitle>Grant module creation permission</DialogTitle>
          <DialogDescription>
            Let a Coordinator create new modules in {departmentName}. This never affects modules
            they already own.
          </DialogDescription>
        </DialogHeader>

        {!hasEligibleCoordinators ? (
          <>
            <Alert
              variant="inline"
              status="info"
              timeout={0}
              title="No eligible coordinators"
              message="Every active coordinator already has a grant record for this department."
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
                title="Couldn't grant module creation permission"
                message={
                  error instanceof ApiError
                    ? error.message
                    : "Something went wrong. Please try again."
                }
              />
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assign-module-creation-coordinator">Coordinator</Label>
                <Select value={coordinatorId} onValueChange={setCoordinatorId}>
                  <SelectTrigger id="assign-module-creation-coordinator">
                    <SelectValue placeholder="Select a coordinator" />
                  </SelectTrigger>
                  <SelectContent container={dialogNode}>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
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
                  {isPending ? "Granting..." : "Grant"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
