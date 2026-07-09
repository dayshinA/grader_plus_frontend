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
import { useDeactivateUser } from "~/features/users/api/use-deactivate-user";
import { useUpdateUser } from "~/features/users/api/use-update-user";
import type { UserResponse } from "~/features/users/types";
import { cn } from "~/lib/utils";

interface DeactivateUserDialogProps {
  user: UserResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful deactivate/reactivate, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (
    action: "deactivated" | "reactivated",
    user: UserResponse,
    apiMessage: string,
  ) => void;
}

export function DeactivateUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateUserDialogProps) {
  const deactivateUser = useDeactivateUser();
  const updateUser = useUpdateUser();
  const isPending = deactivateUser.isPending || updateUser.isPending;

  if (!user) return null;

  const isReactivating = !user.isActive;

  function handleConfirm() {
    if (!user) return;

    if (isReactivating) {
      updateUser.mutate(
        { id: user.id, request: { isActive: true } },
        {
          onSuccess: ({ message }) => {
            onOpenChange(false);
            onSuccess?.("reactivated", user, message);
          },
        },
      );
    } else {
      // DELETE /users/:id only returns { id }, not the full user — use the
      // already-known `user` prop for the toast instead of the response.
      deactivateUser.mutate(user.id, {
        onSuccess: ({ message }) => {
          onOpenChange(false);
          onSuccess?.("deactivated", user, message);
        },
      });
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isReactivating ? "Reactivate this user?" : "Deactivate this user?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReactivating
              ? `${user.fullName} will immediately regain the ability to log in.`
              : `${user.fullName} will be immediately blocked from logging in. Their account is kept, not deleted — you can reactivate it later.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(!isReactivating && buttonVariants({ variant: "destructive" }))}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {isPending ? "Working..." : isReactivating ? "Reactivate" : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
