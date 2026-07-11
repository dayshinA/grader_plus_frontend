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
import { useGrantDepartmentAdmin } from "~/features/department-admin-grants/api/use-grant-department-admin";
import { useRevokeDepartmentAdmin } from "~/features/department-admin-grants/api/use-revoke-department-admin";
import type { DepartmentAdminGrantResponse } from "~/features/department-admin-grants/types";
import { cn } from "~/lib/utils";

type ToggleTarget = DepartmentAdminGrantResponse & { coordinatorName: string };

interface ToggleDepartmentAdminGrantDialogProps {
  grant: ToggleTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful revoke/re-grant, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    action: "revoked" | "granted",
    grant: DepartmentAdminGrantResponse,
    apiMessage: string,
  ) => void;
}

export function ToggleDepartmentAdminGrantDialog({
  grant,
  open,
  onOpenChange,
  onSuccess,
}: ToggleDepartmentAdminGrantDialogProps) {
  const grantDepartmentAdmin = useGrantDepartmentAdmin();
  const revokeDepartmentAdmin = useRevokeDepartmentAdmin();
  const isPending = grantDepartmentAdmin.isPending || revokeDepartmentAdmin.isPending;

  if (!grant) return null;

  const isRevoking = grant.isActive;

  function handleConfirm() {
    if (!grant) return;

    if (isRevoking) {
      revokeDepartmentAdmin.mutate(
        { departmentId: grant.departmentId, coordinatorId: grant.coordinatorId },
        {
          onSuccess: ({ data, message }) => {
            onOpenChange(false);
            onSuccess?.("revoked", data, message);
          },
        },
      );
    } else {
      grantDepartmentAdmin.mutate(
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
            {isRevoking ? "Revoke Department Admin access?" : "Re-grant Department Admin access?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRevoking
              ? `${grant.coordinatorName} will immediately lose oversight of every module in this department except their own. Their very next request for a colleague's module will be denied right away — this isn't just a future-facing change.`
              : `${grant.coordinatorName} will immediately regain oversight of every module in this department.`}
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
