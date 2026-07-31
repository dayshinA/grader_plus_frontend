import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  PermissionKey,
  UserRoleAssignmentDetail,
} from "~/features/permissions/types";
import type {
  CreateRoleAssignmentRequest,
  RoleAssignmentResponse,
} from "~/features/role-assignments/types";

/**
 * The six generic `/role-assignments` routes that replaced twelve bespoke grant
 * endpoints across three controllers in the backend's 2026-07-29/30 RBAC
 * redesign.
 *
 * `api` for the read, `apiWithMessage` for the four writes (decision #31 — a
 * mutation whose result the UI confirms back to the user echoes the backend's
 * own message rather than a hand-written one).
 *
 * ⚠️ Every write here is additionally gated server-side by Rule 1 (permission
 * ceiling, extras only) and Rule 2 (strict hierarchy at the target scope). The
 * route decorators are a coarse "do you hold this anywhere" filter only; the
 * real check runs in `RoleAssignmentsService`, which can see the request body.
 * The client-side filtering in `utils.ts` is UX polish so a grantor isn't
 * offered a control that always fails — it is not the boundary.
 */
export const roleAssignmentsService = {
  /**
   * A given user's **active** assignments. Needs `roles.view` anywhere.
   *
   * ⚠️ Active only — the backing query filters `revoked_at IS NULL`, so there
   * is no revoked history here and a revoked assignment simply vanishes from
   * the list. Unlike the three grant screens this replaces, there is no
   * Active/Revoked badge to render and no re-grant row action; re-granting goes
   * back through `create`, which upserts.
   *
   * Read your own via `permissionsService.getMyPermissions()` instead — that
   * one needs no permission at all.
   */
  listForUser: (userId: string): Promise<UserRoleAssignmentDetail[]> =>
    api.get<UserRoleAssignmentDetail[]>("/role-assignments", {
      params: { userId },
    }),

  /**
   * Grant, or re-grant in place. Needs `roles.assign` anywhere, plus Rules 1
   * and 2 against the target scope.
   */
  create: (
    body: CreateRoleAssignmentRequest,
  ): Promise<ApiResult<RoleAssignmentResponse>> =>
    apiWithMessage.post<RoleAssignmentResponse>("/role-assignments", body),

  /**
   * Soft-revoke an assignment. Needs `roles.revoke` anywhere, **plus Rule 2** —
   * Rule 1 does not apply, since taking a permission away confers nothing.
   *
   * Cascades: every active extra on the assignment is revoked with it.
   */
  revoke: (
    assignmentId: string,
  ): Promise<ApiResult<RoleAssignmentResponse>> =>
    apiWithMessage.delete<RoleAssignmentResponse>(
      `/role-assignments/${assignmentId}`,
    ),

  /**
   * Toggle one extra permission onto an existing assignment. Needs
   * `permissions.assign` anywhere, plus Rules 1 and 2 at the assignment's own
   * scope. Purely additive — a template default can never be subtracted.
   */
  grantExtraPermission: (
    assignmentId: string,
    permissionKey: PermissionKey,
  ): Promise<ApiResult<RoleAssignmentResponse>> =>
    apiWithMessage.post<RoleAssignmentResponse>(
      `/role-assignments/${assignmentId}/permissions`,
      { permissionKey },
    ),

  /**
   * Withdraw one extra. Needs `permissions.revoke` anywhere, plus Rule 2.
   *
   * ⚠️ Addressed by the permission's **UUID**, not its key — the route uses a
   * `ParseUUIDPipe`. `UserRoleAssignmentDetail.extraPermissionKeys` carries
   * keys only, so the caller has to resolve key → id through the catalogue
   * (`GET /permissions`, Phase 1's `usePermissionCatalogue`). 404
   * `ASSIGNMENT_PERMISSION_NOT_FOUND` if the assignment doesn't hold it.
   */
  revokeExtraPermission: (
    assignmentId: string,
    permissionId: string,
  ): Promise<ApiResult<RoleAssignmentResponse>> =>
    apiWithMessage.delete<RoleAssignmentResponse>(
      `/role-assignments/${assignmentId}/permissions/${permissionId}`,
    ),
};
