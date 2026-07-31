import type {
  PermissionCatalogEntry,
  PermissionKey,
  RoleTemplateCatalogEntry,
  ScopeType,
  UserPermissionsSummary,
  UserRoleAssignmentDetail,
} from "~/features/permissions/types";
import { ApiError } from "~/lib/api-client";

/**
 * Client-side mirrors of the backend's two delegation rules, plus the scope
 * containment they both depend on.
 *
 * ⚠️ **UX only.** `RoleAssignmentsService` re-checks every rule server-side and
 * rejects anything these let through. The point of doing it here is not to
 * enforce — it is to avoid offering a grantor a control that always fails, and
 * to explain *why* something isn't offered instead of letting them discover it
 * through a 403.
 *
 * Rule 1 (permission ceiling) — the grantor must already hold, at a covering
 * scope, every key they are conferring. Applies to the **extras layer only**,
 * never to a role template's own defaults. Getting this backwards is the exact
 * bug the backend shipped and reverted on 2026-07-30: it made every leaf role
 * undelegatable, because a Department Admin must never hold a Marker's
 * `evaluations.submit` yet plainly needs to be able to create Markers.
 *
 * Rule 2 (strict hierarchy) — among the grantor's assignments whose scope
 * *contains* the target scope, at least one must sit at a strictly lower
 * `hierarchyLevel` than the template being granted. This is what stops a School
 * Admin minting a peer School Admin while still letting a Department Admin
 * create a Project Coordinator at their own department (lower level, same
 * scope). Rule 2 governs revocation too.
 */

// ---------------------------------------------------------------------------
// Scope containment
// ---------------------------------------------------------------------------

/**
 * A target scope expanded into its org ancestry — the client-side counterpart
 * of the backend's `ResolvedScope`. All fields absent means global.
 */
export interface ResolvedScopeChain {
  schoolId?: string;
  departmentId?: string;
  moduleId?: string;
}

/**
 * The lists needed to walk a scope id up to its ancestors. Both are already
 * loaded by `ScopePicker`, so resolving costs no extra request.
 *
 * Phase 1's `hasPermissionAtScope` deliberately does **not** do this — it has
 * only the summary and answers exact-match-or-global. Here the ancestry is
 * genuinely available (`GET /departments` carries `schoolId`,
 * `GET /academic-modules` carries `departmentId`), and it has to be used: a
 * School Admin of Science granting a Department Admin of Computer Science is
 * the single most common delegation in the system, and exact-match containment
 * would offer them nothing at all.
 */
export interface ScopeAncestrySources {
  departments?: readonly { id: string; schoolId: string }[];
  modules?: readonly { id: string; departmentId: string }[];
}

/**
 * Expand (scopeType, scopeId) into every ancestor id the client can resolve.
 *
 * Degrades rather than throws: if the relevant list hasn't loaded, the ancestor
 * fields are simply absent and containment falls back to exact match. That is
 * the safe direction — it under-offers rather than over-offers, and the server
 * is the real gate either way.
 */
export function resolveScopeChain(
  scopeType: ScopeType,
  scopeId: string | null,
  sources: ScopeAncestrySources = {},
): ResolvedScopeChain {
  if (scopeType === "global" || !scopeId) return {};

  if (scopeType === "school") return { schoolId: scopeId };

  if (scopeType === "department") {
    const department = sources.departments?.find((d) => d.id === scopeId);
    return { departmentId: scopeId, schoolId: department?.schoolId };
  }

  const module = sources.modules?.find((m) => m.id === scopeId);
  const departmentId = module?.departmentId;
  const department = departmentId
    ? sources.departments?.find((d) => d.id === departmentId)
    : undefined;
  return { moduleId: scopeId, departmentId, schoolId: department?.schoolId };
}

/** Does this one assignment's scope contain the resolved target scope? */
export function assignmentContainsScope(
  assignment: UserRoleAssignmentDetail,
  chain: ResolvedScopeChain,
): boolean {
  switch (assignment.scopeType) {
    // Global contains everything, including other global assignments.
    case "global":
      return true;
    case "school":
      return assignment.scopeId === chain.schoolId;
    case "department":
      return assignment.scopeId === chain.departmentId;
    case "module":
      return assignment.scopeId === chain.moduleId;
  }
}

/** Every assignment of the grantor's whose scope contains the target. */
export function containingAssignments(
  summary: UserPermissionsSummary | null,
  chain: ResolvedScopeChain,
): UserRoleAssignmentDetail[] {
  return (summary?.assignments ?? []).filter((assignment) =>
    assignmentContainsScope(assignment, chain),
  );
}

/**
 * The grantor's most senior level *at this scope* — the backend's
 * `getMinContainingHierarchyLevel`. Null when they hold nothing containing it,
 * which means they can delegate nothing there.
 */
export function bestHierarchyLevelAtScope(
  summary: UserPermissionsSummary | null,
  chain: ResolvedScopeChain,
): number | null {
  const assignments = containingAssignments(summary, chain);
  if (assignments.length === 0) return null;
  return Math.min(...assignments.map((a) => a.hierarchyLevel));
}

/** The union of everything the grantor holds at scopes containing the target. */
export function permissionKeysAtScope(
  summary: UserPermissionsSummary | null,
  chain: ResolvedScopeChain,
): PermissionKey[] {
  const keys = new Set<PermissionKey>();
  for (const assignment of containingAssignments(summary, chain)) {
    for (const key of assignment.permissionKeys) keys.add(key);
  }
  return [...keys];
}

// ---------------------------------------------------------------------------
// Rule 2 — what may be granted, and what may be revoked
// ---------------------------------------------------------------------------

/** The scope types a template may legally be assigned at, per `GET /role-templates`. */
export function scopeTypesForTemplate(
  template: RoleTemplateCatalogEntry,
): ScopeType[] {
  return template.scopes.map((scope) => scope.scopeType);
}

/** What a template's defaults confer at one scope type. Empty if it isn't valid there. */
export function defaultPermissionKeysAt(
  template: RoleTemplateCatalogEntry,
  scopeType: ScopeType,
): PermissionKey[] {
  return (
    template.scopes.find((scope) => scope.scopeType === scopeType)
      ?.defaultPermissionKeys ?? []
  );
}

/**
 * Rule 2 applied to a grant: the templates this grantor may confer at this
 * scope. Strictly junior only — equal level is a peer and is rejected.
 *
 * Also filters out templates that aren't valid at `scopeType` at all, which is
 * what prevents a 422 `INVALID_SCOPE_FOR_ROLE_TEMPLATE` rather than catching it
 * after the fact.
 *
 * Returns `[]` for a level-3 grantor (Project Coordinator or Marker). That is
 * correct and permanent, not a loading state: level 3 is the floor of the
 * hierarchy, so they can delegate nothing to anyone. The screen renders that as
 * an explanation, never as an empty dropdown.
 */
export function delegatableTemplates(
  templates: readonly RoleTemplateCatalogEntry[] | undefined,
  summary: UserPermissionsSummary | null,
  scopeType: ScopeType,
  chain: ResolvedScopeChain,
): RoleTemplateCatalogEntry[] {
  const bestLevel = bestHierarchyLevelAtScope(summary, chain);
  if (bestLevel === null) return [];

  return (templates ?? []).filter(
    (template) =>
      template.hierarchyLevel > bestLevel &&
      scopeTypesForTemplate(template).includes(scopeType),
  );
}

/**
 * Rule 2 applied to a revoke (whole assignment, or one of its extras). The
 * backend runs the same check with an empty permission list — Rule 1 is skipped
 * on revocation, since taking a permission away confers nothing.
 *
 * Note the grantor can never revoke their own assignments: they'd have to
 * outrank themselves.
 */
export function canRevokeAssignment(
  summary: UserPermissionsSummary | null,
  assignment: UserRoleAssignmentDetail,
  sources: ScopeAncestrySources = {},
): boolean {
  const chain = resolveScopeChain(
    assignment.scopeType,
    assignment.scopeId,
    sources,
  );
  const bestLevel = bestHierarchyLevelAtScope(summary, chain);
  return bestLevel !== null && bestLevel < assignment.hierarchyLevel;
}

// ---------------------------------------------------------------------------
// Rule 1 — which extras may be offered
// ---------------------------------------------------------------------------

/**
 * Rule 1: only offer extras the grantor themselves holds at a scope containing
 * the target. Applies to the extras layer alone — never used to filter a
 * template's defaults, which Rule 2 governs.
 *
 * `alreadyHeld` drops keys the assignment already has (whether as a default or
 * an existing extra), so the picker never offers a no-op.
 */
export function grantableExtras(
  catalogue: readonly PermissionCatalogEntry[] | undefined,
  grantorKeys: readonly PermissionKey[],
  alreadyHeld: readonly PermissionKey[] = [],
): PermissionCatalogEntry[] {
  const held = new Set(alreadyHeld);
  return (catalogue ?? []).filter(
    (entry) => grantorKeys.includes(entry.key) && !held.has(entry.key),
  );
}

// ---------------------------------------------------------------------------
// Error copy
// ---------------------------------------------------------------------------

const ERROR_COPY: Record<string, string> = {
  ROLE_ASSIGNMENT_HIERARCHY_VIOLATION:
    "You can only assign or revoke roles junior to your own at this scope.",
  PERMISSION_NOT_HELD_BY_GRANTOR:
    "You can't grant a permission you don't hold yourself at this scope.",
  INVALID_SCOPE_FOR_ROLE_TEMPLATE: "That role can't be held at that level.",
  SCOPE_ID_REQUIRED: "Pick a specific school, department or module for this role.",
  SCOPE_ID_NOT_ALLOWED:
    "A global role isn't attached to a school, department or module.",
  ASSIGNMENT_PERMISSION_NOT_FOUND:
    "This role no longer has that extra permission — it may have been withdrawn already.",
  ASSIGNMENT_NOT_FOUND:
    "This role assignment no longer exists — someone else may have revoked it.",
};

/**
 * Turns a failed write into copy for the user.
 *
 * The backend's own `message` is always usable, but the codes above get
 * purpose-written copy because their raw messages are phrased for an API
 * consumer ("You do not outrank the role you are trying to assign or revoke at
 * this scope") rather than for someone looking at a form.
 */
export function roleAssignmentErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_COPY[error.code] ?? error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Is this failure about the scope picker specifically? Drives field-level placement. */
export function isScopeFieldError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "SCOPE_ID_REQUIRED" ||
      error.code === "SCOPE_ID_NOT_ALLOWED" ||
      error.code === "INVALID_SCOPE_FOR_ROLE_TEMPLATE")
  );
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  global: "Everywhere",
  school: "School",
  department: "Department",
  module: "Module",
};

/** Human-readable permission key: `markers.assign` → "Assign markers". */
export function permissionLabel(
  key: PermissionKey,
  catalogue?: readonly PermissionCatalogEntry[],
): string {
  return catalogue?.find((entry) => entry.key === key)?.description ?? key;
}
