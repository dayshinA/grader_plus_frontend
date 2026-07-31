import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PermissionKey } from "~/features/permissions/types";
import { roleAssignmentsService } from "~/features/role-assignments/api/role-assignments.service";
import { userRoleAssignmentsQueryKey } from "~/features/role-assignments/api/use-user-role-assignments";

/**
 * Add one extra permission on top of an existing assignment's template
 * defaults. Subject to Rule 1 — the grantor must already hold the key
 * themselves at a covering scope — so the picker only offers keys from the
 * grantor's own `permissionKeys`.
 */
export function useGrantExtraPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      permissionKey,
    }: {
      assignmentId: string;
      permissionKey: PermissionKey;
      userId: string;
    }) => roleAssignmentsService.grantExtraPermission(assignmentId, permissionKey),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: userRoleAssignmentsQueryKey(variables.userId),
      });
    },
  });
}
