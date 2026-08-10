import { CircleCheck, CircleSlash } from "lucide-react";

import { ChangeSummary } from "~/components/ui/change-summary";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { useDeactivateUser } from "~/features/users/api/use-deactivate-user";
import { useUpdateUser } from "~/features/users/api/use-update-user";
import type { UserResponse } from "~/features/users/types";

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
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={isReactivating ? CircleCheck : CircleSlash}
      title={isReactivating ? "Reactivate this user?" : "Deactivate this user?"}
      description={
        isReactivating
          ? `${user.fullName} will immediately be able to sign in again.`
          : `${user.fullName} will be immediately blocked from signing in. Their account is kept, not deleted — you can reactivate it later.`
      }
      details={
        <ChangeSummary
          items={[
            {
              label: "User",
              to: user.fullName,
            },
            {
              label: "Status",
              from: isReactivating ? "Inactive" : "Active",
              to: isReactivating ? "Active" : "Inactive",
            },
          ]}
        />
      }
      confirmLabel={isReactivating ? "Reactivate" : "Deactivate"}
      pendingLabel="Working…"
      onConfirm={handleConfirm}
      isPending={isPending}
      destructive={!isReactivating}
    />
  );
}
