/**
 * Mirrors the backend's RBAC read model verbatim. Sources, all read 2026-07-31
 * from the live backend repo:
 *   - src/permissions/interfaces/user-role-assignment-detail.interface.ts
 *   - src/permissions/services/permission-catalog.service.ts
 *   - src/permissions/permission-catalog.definition.ts
 *
 * The backend deleted `users.role` in its 2026-07-29/30 RBAC redesign. The JWT
 * is now `{ sub, email }` and the login response's `user` carries no role, so
 * `GET /role-assignments/me` is the *only* source of identity or capability in
 * this app. See CLAUDE.md's non-negotiable constraints.
 */

/** The five role templates. Lower `hierarchyLevel` means more senior. */
export type RoleTemplateKey =
  | "system_administrator"
  | "school_admin"
  | "department_admin"
  | "project_coordinator"
  | "marker";

/** Where a role applies. Broader scopes contain narrower ones (containment). */
export type ScopeType = "global" | "school" | "department" | "module";

/**
 * `functional` = day-to-day assessment work. `administrative` = managing the
 * system itself. The split exists so a delegation screen can present the extras
 * picker as two groups.
 */
export type PermissionCategory = "functional" | "administrative";

/**
 * Every permission key in the backend catalogue, read 2026-07-31 from
 * `permission-catalog.definition.ts` — which is the single source of truth
 * server-side (a seeder reconciles the DB from it on every boot).
 *
 * Deliberately a closed union rather than `string`: a typo in a permission gate
 * would otherwise be a silently-false check that hides a control from everyone,
 * which is near-impossible to spot in review. If the backend adds a key, add it
 * here in the same session.
 */
export type PermissionKey =
  | "annotations.create"
  | "annotations.delete"
  | "annotations.update"
  | "annotations.view"
  | "audit_logs.view"
  | "calendar.manage"
  | "dashboard.view"
  | "dashboard.view_own"
  | "departments.create"
  | "departments.deactivate"
  | "departments.update"
  | "departments.view"
  | "departments.view_detail"
  | "discrepancies.resolve"
  | "discrepancies.view"
  | "evaluations.submit"
  | "evaluations.view"
  | "grades.export"
  | "grades.view"
  | "markers.assign"
  | "marking_status.view"
  | "modules.create"
  | "modules.deactivate"
  | "modules.update"
  | "modules.view"
  | "notifications.send"
  | "permissions.assign"
  | "permissions.revoke"
  | "roles.assign"
  | "roles.revoke"
  | "roles.view"
  | "roles.view_candidates"
  | "rubrics.create"
  | "rubrics.delete"
  | "rubrics.update"
  | "rubrics.view"
  | "schools.create"
  | "schools.deactivate"
  | "schools.update"
  | "schools.view"
  | "schools.view_detail"
  | "submissions.download"
  | "submissions.upload"
  | "submissions.view"
  | "system.settings.manage"
  | "users.bulk_import"
  | "users.create"
  | "users.deactivate"
  | "users.update"
  | "users.view";

/** One "user X holds role R at scope S" row, with its resolved permission set. */
export interface UserRoleAssignmentDetail {
  id: string;
  userId: string;
  roleTemplateKey: RoleTemplateKey;
  roleTemplateName: string;
  /** Lower is more senior: system_administrator 0, school_admin 1, department_admin 2, project_coordinator 3, marker 4. */
  hierarchyLevel: number;
  scopeType: ScopeType;
  /** Null when `scopeType` is "global". */
  scopeId: string | null;
  grantedBy: string | null;
  /** ISO string — a `Date` server-side, a string once it's been through JSON. */
  grantedAt: string;
  /** Template defaults for this assignment's scope type ∪ its active extras. */
  permissionKeys: PermissionKey[];
  /** The additive layer alone — which extras are currently toggled on. */
  extraPermissionKeys: PermissionKey[];
}

/** The payload of `GET /role-assignments/me`. */
export interface UserPermissionsSummary {
  userId: string;
  /**
   * Role identity — "who am I". Kept first-class and separate from capability,
   * mirroring the backend's own split: some rules are about who someone *is*
   * (only a Coordinator can be named as a module's coordinator; a Super Admin
   * can never be assigned as a marker), not about what they can do to a
   * specific resource.
   */
  roleTemplateKeys: RoleTemplateKey[];
  assignments: UserRoleAssignmentDetail[];
  /**
   * ⚠️ SCOPE-BLIND. The deduplicated union across every active assignment,
   * ignoring where each was held. Use it to decide whether a control renders at
   * all — never as authorisation. A Department Admin of Computer Science and a
   * Coordinator of one Physics module produce a single flat list here with no
   * indication of which permission came from which scope.
   *
   * Every screen must still handle a 403 gracefully even when this list
   * suggested the action was available.
   */
  permissionKeys: PermissionKey[];
}

/** One entry of `GET /permissions`. */
export interface PermissionCatalogEntry {
  id: string;
  key: PermissionKey;
  category: PermissionCategory;
  description: string;
}

/**
 * One entry of `GET /role-templates`, ordered most senior first. `scopes`
 * carries the scope types this template may legally be assigned at and what its
 * defaults confer at each — enough for a delegation screen to preview the
 * effect of a pick before submitting, and to avoid offering a combination the
 * backend would reject with 422 INVALID_SCOPE_FOR_ROLE_TEMPLATE.
 */
export interface RoleTemplateCatalogEntry {
  id: string;
  key: RoleTemplateKey;
  name: string;
  description: string;
  hierarchyLevel: number;
  scopes: { scopeType: ScopeType; defaultPermissionKeys: PermissionKey[] }[];
}
