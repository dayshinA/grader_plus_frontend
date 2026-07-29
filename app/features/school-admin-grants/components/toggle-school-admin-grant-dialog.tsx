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
import { useGrantSchoolAdmin } from "~/features/school-admin-grants/api/use-grant-school-admin";
import { useRevokeSchoolAdmin } from "~/features/school-admin-grants/api/use-revoke-school-admin";
import type { SchoolAdminGrantResponse } from "~/features/school-admin-grants/types";
import { cn } from "~/lib/utils";

type ToggleTarget = SchoolAdminGrantResponse & { coordinatorName: string };

interface ToggleSchoolAdminGrantDialogProps {
  grant: ToggleTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful revoke/re-grant, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    action: "revoked" | "granted",
    grant: SchoolAdminGrantResponse,
    apiMessage: string,
  ) => void;
}

export function ToggleSchoolAdminGrantDialog({
  grant,
  open,
  onOpenChange,
  onSuccess,
}: ToggleSchoolAdminGrantDialogProps) {
  const grantSchoolAdmin = useGrantSchoolAdmin();
  const revokeSchoolAdmin = useRevokeSchoolAdmin();
  const isPending = grantSchoolAdmin.isPending || revokeSchoolAdmin.isPending;

  if (!grant) return null;

  const isRevoking = grant.isActive;

  function handleConfirm() {
    if (!grant) return;

    if (isRevoking) {
      revokeSchoolAdmin.mutate(
        { schoolId: grant.schoolId, coordinatorId: grant.coordinatorId },
        {
          onSuccess: ({ data, message }) => {
            onOpenChange(false);
            onSuccess?.("revoked", data, message);
          },
        },
      );
    } else {
      grantSchoolAdmin.mutate(
        { schoolId: grant.schoolId, coordinatorId: grant.coordinatorId },
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
            {isRevoking ? "Revoke School Admin access?" : "Re-grant School Admin access?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRevoking
              ? `${grant.coordinatorName} will immediately lose oversight of every department and module in this school, and can no longer create departments or delegate Department Admins here. This isn't just a future-facing change.`
              : `${grant.coordinatorName} will immediately regain oversight of every department and module in this school.`}
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
