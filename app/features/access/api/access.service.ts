import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type { GrantRolePayload, ResolvedGrant, RoleAssignment } from "~/features/access/types";

/**
 * Role grants and what the caller holds. `GET /me/permissions` is the only thing the UI
 * gates on: the token carries a user id and nothing else, so it is never decoded.
 */
export const accessService = {
  myPermissions(): Promise<ResolvedGrant[]> {
    return api.get<ResolvedGrant[]>("/me/permissions");
  },

  /** Revoked grants come back too, because history is the point of the table. */
  listRoles(userId: string): Promise<RoleAssignment[]> {
    return api.get<RoleAssignment[]>(`/users/${userId}/roles`);
  },

  grantRole(userId: string, payload: GrantRolePayload): Promise<ApiResult<RoleAssignment>> {
    return apiWithMessage.post<RoleAssignment>(`/users/${userId}/roles`, payload);
  },

  /** Revoked, not deleted. The row stays visible with a revokedAt on it. */
  revokeRole(roleAssignmentId: string): Promise<ApiResult<RoleAssignment>> {
    return apiWithMessage.delete<RoleAssignment>(`/roles/${roleAssignmentId}`);
  },
};
