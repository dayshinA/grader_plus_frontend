import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type { GrantRolePayload, ResolvedGrant, RoleAssignment } from "~/features/access/types";
import type { ImportReport } from "~/types/import-report";

// `GET /me/permissions` is the only thing the UI gates on. The token is never decoded.
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

  // Sets revoked_at rather than deleting, but no route returns a revoked grant.
  revokeRole(roleAssignmentId: string): Promise<ApiResult<RoleAssignment>> {
    return apiWithMessage.delete<RoleAssignment>(`/roles/${roleAssignmentId}`);
  },

  // A file of one column, email. The role and scope come from the route, and no accounts are created.
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
