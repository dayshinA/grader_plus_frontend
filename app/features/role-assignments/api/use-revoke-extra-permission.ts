import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roleAssignmentsService } from "~/features/role-assignments/api/role-assignments.service";
import { userRoleAssignmentsQueryKey } from "~/features/role-assignments/api/use-user-role-assignments";

/**
 * Withdraw one extra from an assignment, leaving its template defaults intact.
 *
 * ⚠️ `permissionId` is the permission's **UUID**, not its key — the route takes
 * a `ParseUUIDPipe`. Callers resolve it through the permission catalogue
 * (`usePermissionCatalogue`), since the assignment detail carries keys only.
 *
 * The invalidation promise is **returned** for the same reason as
 * `useGrantExtraPermission`'s — see its comment.
 */
export function useRevokeExtraPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      permissionId,
    }: {
      assignmentId: string;
      permissionId: string;
      userId: string;
    }) => roleAssignmentsService.revokeExtraPermission(assignmentId, permissionId),
    onSuccess: (_result, variables) =>
      queryClient.invalidateQueries({
        queryKey: userRoleAssignmentsQueryKey(variables.userId),
      }),
  });
}
