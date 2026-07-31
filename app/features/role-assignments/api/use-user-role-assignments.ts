import { useQuery } from "@tanstack/react-query";
import { roleAssignmentsService } from "~/features/role-assignments/api/role-assignments.service";

export const userRoleAssignmentsQueryKey = (userId: string) =>
  ["role-assignments", userId] as const;

/**
 * A target user's **active** role assignments — the delegation screen's table.
 *
 * `enabled` is gated on a user actually being selected, same convention as
 * `useDepartmentCoordinators`. Requires `roles.view` anywhere; a caller without
 * it gets a 403 rather than an empty list, which the page renders as its
 * blocked state.
 */
export function useUserRoleAssignments(userId: string | undefined) {
  return useQuery({
    queryKey: userRoleAssignmentsQueryKey(userId ?? ""),
    queryFn: () => roleAssignmentsService.listForUser(userId as string),
    enabled: Boolean(userId),
  });
}
