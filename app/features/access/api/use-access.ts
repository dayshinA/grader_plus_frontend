import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accessService } from "~/features/access/api/access.service";
import type { GrantRolePayload } from "~/features/access/types";
import { userKeys } from "~/features/users/api/use-users";

export const accessKeys = {
  all: ["access"] as const,
  roles: (userId: string) => [...accessKeys.all, "roles", userId] as const,
};

/**
 * Active grants only, and only the ones the caller's own scope reaches. A coordinator
 * reading a marker who also works in another School sees the offering they share and
 * nothing else, so this list can be shorter than the person actually holds.
 */
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: accessKeys.roles(userId ?? ""),
    queryFn: () => accessService.listRoles(userId as string),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  });
}

/**
 * A grant changes what somebody can do, so anything derived from it is refetched. When the
 * grant is the caller's own, that includes their own permission set and therefore their
 * navigation.
 */
function invalidateAfterGrantChange(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  void queryClient.invalidateQueries({ queryKey: accessKeys.roles(userId) });
  void queryClient.invalidateQueries({ queryKey: userKeys.all });
  void queryClient.invalidateQueries({ queryKey: ["auth", "permissions"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useGrantRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GrantRolePayload) => accessService.grantRole(userId, payload),
    onSuccess: () => invalidateAfterGrantChange(queryClient, userId),
  });
}

export function useRevokeRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleAssignmentId: string) => accessService.revokeRole(roleAssignmentId),
    onSuccess: () => invalidateAfterGrantChange(queryClient, userId),
  });
}
