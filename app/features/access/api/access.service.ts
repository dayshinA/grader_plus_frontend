import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type { GrantRolePayload, ResolvedGrant, RoleAssignment } from "~/features/access/types";
import type { ImportReport } from "~/types/import-report";

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

  /**
   * A file of one column, `email`: every listed existing account becomes eligible for
   * marking assignment on the offering. The role and scope come from the route, so the
   * file carries neither, and the route creates no accounts. Refused with 409 on a closed
   * offering.
   */
  importMarkerRoles(
    offeringId: string,
    file: File,
    dryRun: boolean,
  ): Promise<ApiResult<ImportReport>> {
    const body = new FormData();
    body.append("file", file);
    body.append("dryRun", dryRun ? "true" : "false");
    return apiWithMessage
      .post<{ report: ImportReport }>(`/offerings/${offeringId}/marker-roles/import`, body)
      .then(({ data, message }) => ({ data: data.report, message }));
  },
};
