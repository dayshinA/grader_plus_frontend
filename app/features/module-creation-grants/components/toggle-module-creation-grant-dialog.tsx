import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { buttonVariants } from "~/components/ui/button";
import { useGrantModuleCreation } from "~/features/module-creation-grants/api/use-grant-module-creation";
import { useRevokeModuleCreation } from "~/features/module-creation-grants/api/use-revoke-module-creation";
import type { ModuleCreationGrantResponse } from "~/features/module-creation-grants/types";
import { cn } from "~/lib/utils";

type ToggleTarget = ModuleCreationGrantResponse & { coordinatorName: string };

interface ToggleModuleCreationGrantDialogProps {
  grant: ToggleTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful revoke/re-grant, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    action: "revoked" | "granted",
    grant: ModuleCreationGrantResponse,
    apiMessage: string,
  ) => void;
}

export function ToggleModuleCreationGrantDialog({
  grant,
  open,
  onOpenChange,
  onSuccess,
}: ToggleModuleCreationGrantDialogProps) {
  const grantModuleCreation = useGrantModuleCreation();
  const revokeModuleCreation = useRevokeModuleCreation();
  const isPending = grantModuleCreation.isPending || revokeModuleCreation.isPending;

  if (!grant) return null;

  const isRevoking = grant.isActive;

  function handleConfirm() {
    if (!grant) return;

    if (isRevoking) {
      revokeModuleCreation.mutate(
        { departmentId: grant.departmentId, coordinatorId: grant.coordinatorId },
        {
          onSuccess: ({ data, message }) => {
            onOpenChange(false);
            onSuccess?.("revoked", data, message);
          },
        },
      );
    } else {
      grantModuleCreation.mutate(
        { departmentId: grant.departmentId, coordinatorId: grant.coordinatorId },
        {
          onSuccess: ({ data, message }) => {
            onOpenChange(false);
            onSuccess?.("granted", data, message);
          },
        },
      );
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRevoking
              ? "Revoke module creation permission?"
              : "Re-grant module creation permission?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRevoking
              ? `${grant.coordinatorName} will no longer be able to create new modules in this department. This only affects future module creation — it does not touch any module they already own, and does not remove their access to those modules.`
              : `${grant.coordinatorName} will be able to create new modules in this department again.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(isRevoking && buttonVariants({ variant: "destructive" }))}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {isPending ? "Working..." : isRevoking ? "Revoke" : "Re-grant"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
