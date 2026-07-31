import type {
  PermissionKey,
  RoleTemplateKey,
  ScopeType,
} from "~/features/permissions/types";

/**
 * The *write* side of RBAC. `features/permissions/` is the read side — this
 * folder is the only place that mutates role assignments.
 *
 * Shapes read 2026-07-31 from the live backend repo:
 *   - src/permissions/role-assignments.controller.ts
 *   - src/permissions/dto/create-role-assignment.dto.ts
 *   - src/permissions/interfaces/role-assignment-response.interface.ts
 */

/**
 * The echo returned by `POST /role-assignments`, `DELETE /role-assignments/:id`
 * and both extras routes.
 *
 * ⚠️ Deliberately **not** `UserRoleAssignmentDetail`. The backend keeps the two
 * apart on purpose (see its own comment on the interface): this write-side echo
 * confirms what was written and carries revocation fields, while the read-side
 * detail carries the template's name, its hierarchy level and the assignment's
 * resolved permission set — everything a table row needs and this one lacks.
 *
 * So nothing rebuilds a row from this. Mutations invalidate the read query and
 * let the list re-fetch; this type exists to type the response and to pull
 * `message` out for a success toast (decision #31).
 */
export interface RoleAssignmentResponse {
  id: string;
  userId: string;
  roleTemplateKey: RoleTemplateKey;
  scopeType: ScopeType;
  scopeId: string | null;
  grantedBy: string;
  /** ISO string — a `Date` server-side, a string once through JSON. */
  grantedAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  extraPermissionKeys: PermissionKey[];
}

/**
 * Body of `POST /role-assignments`. Mirrors `CreateRoleAssignmentDto` exactly.
 *
 * `scopeId` is required unless `scopeType` is `"global"`, and forbidden when it
 * is — cross-field validation the backend does in the service rather than the
 * DTO, surfacing as 422 `SCOPE_ID_REQUIRED` / `SCOPE_ID_NOT_ALLOWED`.
 *
 * Re-granting an existing (userId, roleTemplateKey, scopeType, scopeId) — even
 * a previously revoked one — **updates that row in place** rather than
 * inserting a duplicate. There is no separate "re-grant" call.
 */
export interface CreateRoleAssignmentRequest {
  userId: string;
  roleTemplateKey: RoleTemplateKey;
  scopeType: ScopeType;
  scopeId?: string;
  /**
   * The additive layer on top of the template's defaults. These — and only
   * these — are subject to Rule 1 (the grantor must already hold each one).
   * All-or-nothing: one key the grantor lacks rejects the whole request.
   */
  extraPermissionKeys?: PermissionKey[];
}

/** Body of `POST /role-assignments/:id/permissions`. */
export interface GrantExtraPermissionRequest {
  permissionKey: PermissionKey;
}

/**
 * Error codes the delegation screen handles distinctly. Anything else falls
 * back to the backend's own `message`, which is always present on an
 * `ApiError`.
 */
export type RoleAssignmentErrorCode =
  /** 403, Rule 2 — the grantor doesn't outrank the template at the target scope. */
  | "ROLE_ASSIGNMENT_HIERARCHY_VIOLATION"
  /** 403, Rule 1 — an extra the grantor doesn't hold themselves. */
  | "PERMISSION_NOT_HELD_BY_GRANTOR"
  /** 422 — e.g. Super Admin anywhere but global, School Admin at module scope. */
  | "INVALID_SCOPE_FOR_ROLE_TEMPLATE"
  /** 422 — field-level, belongs on the scope picker. */
  | "SCOPE_ID_REQUIRED"
  /** 422 — field-level, belongs on the scope picker. */
  | "SCOPE_ID_NOT_ALLOWED"
  /** 404 — the assignment doesn't currently hold that extra. */
  | "ASSIGNMENT_PERMISSION_NOT_FOUND"
  /** 404 — the assignment was revoked by someone else since the list loaded. */
  | "ASSIGNMENT_NOT_FOUND";
