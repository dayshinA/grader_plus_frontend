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

  /** Active grants only, narrowed to the scopes the caller reaches. */
  listRoles(userId: string): Promise<RoleAssignment[]> {
    return api.get<RoleAssignment[]>(`/users/${userId}/roles`);
  },

  grantRole(userId: string, payload: GrantRolePayload): Promise<ApiResult<RoleAssignment>> {
    return apiWithMessage.post<RoleAssignment>(`/users/${userId}/roles`, payload);
  },

  /** Sets revoked_at rather than deleting, so marking already recorded is untouched. The
   * grant leaves every list, because no route returns a revoked one. */
  revokeRole(roleAssignmentId: string): Promise<ApiResult<RoleAssignment>> {
    return apiWithMessage.delete<RoleAssignment>(`/roles/${roleAssignmentId}`);
  },
};
