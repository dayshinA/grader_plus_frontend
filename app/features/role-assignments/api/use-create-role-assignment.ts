import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roleAssignmentsService } from "~/features/role-assignments/api/role-assignments.service";
import { userRoleAssignmentsQueryKey } from "~/features/role-assignments/api/use-user-role-assignments";
import type { CreateRoleAssignmentRequest } from "~/features/role-assignments/types";

/**
 * Grant a role, or re-grant a previously revoked one — the backend upserts by
 * (user, template, scope), so both call sites share this one mutation. Same
 * shape as the `useGrantDepartmentAdmin` it replaces.
 *
 * Invalidates rather than writing the response into the cache: the write-side
 * echo doesn't carry the template name, hierarchy level or resolved permission
 * set the table renders (see `RoleAssignmentResponse`'s comment).
 */
export function useCreateRoleAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRoleAssignmentRequest) =>
      roleAssignmentsService.create(body),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: userRoleAssignmentsQueryKey(variables.userId),
      });
    },
  });
}
