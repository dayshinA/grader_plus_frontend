import { ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { ChangeSummary } from "~/components/ui/change-summary";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import type { UserRoleAssignmentDetail } from "~/features/permissions/types";
import { useRevokeRoleAssignment } from "~/features/role-assignments/api/use-revoke-role-assignment";
import type { RoleAssignmentResponse } from "~/features/role-assignments/types";
import { roleAssignmentErrorMessage } from "~/features/role-assignments/utils";

interface RevokeRoleAssignmentDialogProps {
  assignment: UserRoleAssignmentDetail | null;
  /** Label for the scope, resolved by the caller (which already has the org lists). */
  scopeLabel: string;
  targetUserName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (assignment: RoleAssignmentResponse, apiMessage: string) => void;
}

/**
 * Confirms revoking a whole assignment.
 *
 * Two things the copy has to say, because neither is obvious and both are
 * irreversible-looking from the user's side:
 *   - revoking **cascades to every extra** on the assignment, and
 *   - the row then **disappears** rather than showing as revoked, because
 *     `GET /role-assignments?userId=` only ever returns active rows.
 *
 * Re-granting is possible afterwards (the backend upserts the same row back to
 * active), so the copy says that too rather than implying permanence.
 *
 * A failure is surfaced as a toast rather than inside the dialog: `ConfirmDialog` stays open
 * until the caller closes it, so the admin is still looking at what they tried to revoke.
 */
export function RevokeRoleAssignmentDialog({
  assignment,
  scopeLabel,
  targetUserName,
  open,
  onOpenChange,
  onSuccess,
}: RevokeRoleAssignmentDialogProps) {
  const revokeAssignment = useRevokeRoleAssignment();

  function handleConfirm() {
    if (!assignment) return;

    revokeAssignment.mutate(
      { assignmentId: assignment.id, userId: assignment.userId },
      {
        onSuccess: ({ data, message }) => {
          onOpenChange(false);
          onSuccess?.(data, message);
        },
        onError: (error) => {
          toast.error(roleAssignmentErrorMessage(error));
        },
      },
    );
  }

  const extrasCount = assignment?.extraPermissionKeys.length ?? 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={ShieldOff}
      title="Revoke this role?"
      description={
        <>
          {targetUserName} will lose the {assignment?.roleTemplateName} role at {scopeLabel}
          {extrasCount > 0
            ? `, along with ${extrasCount} extra permission${extrasCount === 1 ? "" : "s"} added on top of it.`
            : "."}{" "}
          You can assign it again later.
        </>
      }
      details={
        <ChangeSummary
          items={[
            { label: "User", to: targetUserName },
            { label: "Role", from: assignment?.roleTemplateName, to: "None" },
            { label: "Scope", to: scopeLabel },
            ...(extrasCount > 0
              ? [
                  {
                    label: "Extra permissions",
                    from: `${extrasCount} granted`,
                    to: "All removed",
                  },
                ]
              : []),
          ]}
          caption="The row disappears from the list once revoked — only active assignments are returned."
        />
      }
      confirmLabel="Revoke role"
      pendingLabel="Revoking…"
      onConfirm={handleConfirm}
      isPending={revokeAssignment.isPending}
      destructive
    />
  );
}
