import type {
  PermissionKey,
  RoleTemplateKey,
  ScopeType,
  UserPermissionsSummary,
} from "~/features/permissions/types";

/**
 * Predicates over the `/role-assignments/me` summary.
 *
 * ⚠️ Read this before using any of them: these decide whether a control is
 * *rendered*, never whether an action is *allowed*. The server re-checks every
 * request against the real per-scope model, and a screen must handle a 403
 * gracefully even when a predicate here returned true. Blind isolation and
 * every data boundary live server-side — see CLAUDE.md's non-negotiable
 * constraints.
 */

/** Does this user hold `key` anywhere at all? Scope-blind — see `UserPermissionsSummary.permissionKeys`. */
export function hasPermission(
  summary: UserPermissionsSummary | null,
  key: PermissionKey,
): boolean {
  return summary?.permissionKeys.includes(key) ?? false;
}

/** Any-of. True if the user holds at least one of `keys` anywhere. Empty list is false. */
export function hasAnyPermission(
  summary: UserPermissionsSummary | null,
  keys: readonly PermissionKey[],
): boolean {
  return keys.some((key) => hasPermission(summary, key));
}

/** All-of. True only if the user holds every one of `keys` somewhere (not necessarily the same scope). */
export function hasAllPermissions(
  summary: UserPermissionsSummary | null,
  keys: readonly PermissionKey[],
): boolean {
  return keys.every((key) => hasPermission(summary, key));
}

/**
 * Does this user hold `key` at a scope that contains (`scopeType`, `scopeId`)?
 *
 * ⚠️ **Partial by necessity.** Real containment needs the resource's ancestry —
 * that a module belongs to a department which belongs to a school — and the
 * client does not have it. `/role-assignments/me` returns bare scope ids with
 * no parent chain, and there is no endpoint that resolves one.
 *
 * So this answers confidently in exactly two cases:
 *   - a `global` assignment, which contains everything, and
 *   - an exact (scopeType, scopeId) match.
 *
 * It returns **false** for a genuine containment hit it cannot see — a School
 * Admin of Science asked about a module inside Science. That is the safe
 * direction to be wrong in for hiding a control, but it means this must not be
 * used to *hide* anything a broader-scoped admin legitimately reaches. For
 * those, render the control and let the server's 403 be the answer.
 *
 * Use `hasPermission` for coarse "should this nav item exist" questions. Reach
 * for this one only when the exact scope is genuinely known and matters — e.g.
 * a delegation screen deciding what to offer at a scope the user just picked.
 */
export function hasPermissionAtScope(
  summary: UserPermissionsSummary | null,
  key: PermissionKey,
  scopeType: ScopeType,
  scopeId: string | null,
): boolean {
  if (!summary) return false;

  return summary.assignments.some((assignment) => {
    if (!assignment.permissionKeys.includes(key)) return false;
    if (assignment.scopeType === "global") return true;
    return assignment.scopeType === scopeType && assignment.scopeId === scopeId;
  });
}

/**
 * Is this user an X? Role *identity*, deliberately distinct from capability —
 * mirrors the backend's own split (`hasActiveRoleTemplate` vs `hasPermission`).
 *
 * Use where the rule is about who someone is rather than what they may touch:
 * the module form's coordinator picker is Super-Admin-only because the backend
 * forces everyone else's `coordinatorId` to their own id, which is a statement
 * about identity, not about `modules.create`.
 */
export function hasRole(
  summary: UserPermissionsSummary | null,
  key: RoleTemplateKey,
): boolean {
  return summary?.roleTemplateKeys.includes(key) ?? false;
}

/** Any-of over role identity. */
export function hasAnyRole(
  summary: UserPermissionsSummary | null,
  keys: readonly RoleTemplateKey[],
): boolean {
  return keys.some((key) => hasRole(summary, key));
}

/**
 * The most senior level this user holds — the *lowest* `hierarchyLevel` across
 * their assignments, since 0 is Super Admin and 3 is the Coordinator/Marker
 * floor. Null when they hold nothing, which is now a reachable state.
 *
 * Drives landing-page choice, and in Phase 2 the delegation screen's Rule 2
 * filter (offer only templates strictly junior to what the grantor holds).
 */
export function bestHierarchyLevel(
  summary: UserPermissionsSummary | null,
): number | null {
  if (!summary || summary.assignments.length === 0) return null;
  return Math.min(
    ...summary.assignments.map((assignment) => assignment.hierarchyLevel),
  );
}

/** True when the user holds no role assignments at all — can log in, can do nothing else. */
export function hasNoAssignments(
  summary: UserPermissionsSummary | null,
): boolean {
  return (summary?.assignments.length ?? 0) === 0;
}
