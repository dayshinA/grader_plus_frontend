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
import { Alert } from "~/components/ui/alert";
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
      },
    );
  }

  const extrasCount = assignment?.extraPermissionKeys.length ?? 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke this role?</AlertDialogTitle>
          <AlertDialogDescription>
            {targetUserName} will lose the {assignment?.roleTemplateName} role at{" "}
            {scopeLabel}
            {extrasCount > 0
              ? `, along with ${extrasCount} extra permission${extrasCount === 1 ? "" : "s"} added on top of it.`
              : "."}{" "}
            You can assign it again later.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {revokeAssignment.error && (
          <Alert
            variant="inline"
            status="error"
            timeout={0}
            title="Couldn't revoke the role"
            message={roleAssignmentErrorMessage(revokeAssignment.error)}
          />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={revokeAssignment.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Keep the dialog open so a failure is visible in it, rather than
              // letting AlertDialogAction's default close swallow the error.
              event.preventDefault();
              handleConfirm();
            }}
            disabled={revokeAssignment.isPending}
            data-loading={revokeAssignment.isPending}
          >
            {revokeAssignment.isPending ? "Revoking..." : "Revoke role"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
