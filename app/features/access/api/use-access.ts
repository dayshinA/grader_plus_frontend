import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accessService } from "~/features/access/api/access.service";
import type { GrantRolePayload } from "~/features/access/types";
import { assignmentKeys } from "~/features/assignments/api/use-assignments";
import { userKeys } from "~/features/users/api/use-users";

export const accessKeys = {
  all: ["access"] as const,
  roles: (userId: string) => [...accessKeys.all, "roles", userId] as const,
};

// Only the scopes the caller reaches, so this can be shorter than the person actually holds.
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: accessKeys.roles(userId ?? ""),
    queryFn: () => accessService.listRoles(userId as string),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  });
}

// A grant changes what somebody can do, including their own navigation.
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

/** Feeds the eligible marker list on the assignment screen. A dry run writes nothing. */
export function useImportMarkerRoles(offeringId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      accessService.importMarkerRoles(offeringId, file, dryRun),
    onSuccess: (_result, { dryRun }) => {
      if (dryRun) return;
      void queryClient.invalidateQueries({ queryKey: assignmentKeys.markers(offeringId) });
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
