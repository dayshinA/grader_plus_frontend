import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roleAssignmentsService } from "~/features/role-assignments/api/role-assignments.service";
import { userRoleAssignmentsQueryKey } from "~/features/role-assignments/api/use-user-role-assignments";

/**
 * Revoke a whole assignment. Cascades to every extra on it — the confirmation
 * dialog says so.
 *
 * `userId` is carried in the variables purely to invalidate the right list: the
 * endpoint itself is addressed by assignment id alone.
 */
export function useRevokeRoleAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId }: { assignmentId: string; userId: string }) =>
      roleAssignmentsService.revoke(assignmentId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: userRoleAssignmentsQueryKey(variables.userId),
      });
    },
  });
}
