import type {
  PermissionCatalogEntry,
  PermissionKey,
  RoleTemplateCatalogEntry,
  RoleTemplateKey,
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

/**
 * What one assignment's scope is *called* — "Science", "Everywhere" — resolved against the named
 * options `useScopeOptions` already builds.
 *
 * Falls back to the bare scope type when the name can't be resolved, which is a real case rather
 * than a defensive one: a Department Admin can't read `GET /departments` at all, so their own
 * department has no name to show (see `useScopeOptions`'s unnamed-scope note). Printing "Department"
 * is better than printing a UUID.
 *
 * The options argument is typed structurally rather than as `useScopeOptions`'s own `ScopeOption[]`
 * so this file stays free of imports from the api layer — that hook already imports from here.
 */
export function scopeLabelFor(
  assignment: Pick<UserRoleAssignmentDetail, "scopeType" | "scopeId">,
  optionsByScopeType: Partial<
    Record<ScopeType, readonly { id: string; label: string }[]>
  >,
): string {
  if (assignment.scopeType === "global") return SCOPE_TYPE_LABELS.global;
  const named = optionsByScopeType[assignment.scopeType]?.find(
    (option) => option.id === assignment.scopeId,
  )?.label;
  return named ?? SCOPE_TYPE_LABELS[assignment.scopeType];
}

/**
 * Friendly display copy for a permission key — a short "Can ___" title plus a plain-English
 * one-liner, for the role-template defaults preview (`RoleTemplatePicker`). Neither the raw key
 * (`schools.view`) nor the catalogue's own developer-facing description (e.g. "List/view schools
 * (self-filtered by service)") is something every viewer of a role-assignment screen should have
 * to parse.
 *
 * Deliberately a hand-written map rather than derived from the key string — `roles.view_candidates`,
 * `users.bulk_import`, and `system.settings.manage` don't reduce to a consistent "resource.verb"
 * pattern cleanly enough to auto-generate readable English from. Same discipline as
 * `PermissionKey` itself: if the backend adds a key, add it here too.
 */
const PERMISSION_DISPLAY: Record<PermissionKey, { title: string; description: string }> = {
  "annotations.create": {
    title: "Can create annotations",
    description: "Add a new annotation on a submission.",
  },
  "annotations.delete": {
    title: "Can delete annotations",
    description: "Remove an annotation from a submission.",
  },
  "annotations.update": {
    title: "Can edit annotations",
    description: "Change the text of an existing annotation.",
  },
  "annotations.view": {
    title: "Can view annotations",
    description: "Read annotations without editing them.",
  },
  "audit_logs.view": {
    title: "Can view audit logs",
    description: "See a record of admin actions. (Not built yet.)",
  },
  "calendar.manage": {
    title: "Can manage the calendar",
    description: "Schedule and manage events. (Not built yet.)",
  },
  "dashboard.view": {
    title: "Can view the dashboard",
    description: "See the module-wide marking progress dashboard.",
  },
  "dashboard.view_own": {
    title: "Can view their own dashboard",
    description: "See a personal view of their own outstanding marking work.",
  },
  "departments.create": {
    title: "Can create departments",
    description: "Add a new department to a school.",
  },
  "departments.deactivate": {
    title: "Can deactivate departments",
    description: "Turn off a department without deleting it.",
  },
  "departments.update": {
    title: "Can edit departments",
    description: "Change a department's details.",
  },
  "departments.view": {
    title: "Can view departments",
    description: "See the list of departments.",
  },
  "departments.view_detail": {
    title: "Can view department details",
    description: "See the full detail page for a single department.",
  },
  "discrepancies.resolve": {
    title: "Can resolve discrepancies",
    description: "Record the final agreed mark when markers disagree.",
  },
  "discrepancies.view": {
    title: "Can view discrepancies",
    description: "See cases where markers disagreed on a grade.",
  },
  "evaluations.submit": {
    title: "Can submit evaluations",
    description: "Create, edit, and submit their own marking evaluations.",
  },
  "evaluations.view": {
    title: "Can view evaluations",
    description: "Read an evaluation without editing it.",
  },
  "grades.export": {
    title: "Can export grades",
    description: "Send final grades to Learn.",
  },
  "grades.view": {
    title: "Can view grades",
    description: "See final grades without exporting them.",
  },
  "markers.assign": {
    title: "Can assign markers",
    description: "Assign markers to student submissions.",
  },
  "marking_status.view": {
    title: "Can view marking status",
    description: "See how far along marking is for each student.",
  },
  "modules.create": {
    title: "Can create modules",
    description: "Add a new academic module.",
  },
  "modules.deactivate": {
    title: "Can deactivate modules",
    description: "Turn off a module without deleting it.",
  },
  "modules.update": {
    title: "Can edit modules",
    description: "Change a module's details.",
  },
  "modules.view": {
    title: "Can view modules",
    description: "See the list of academic modules.",
  },
  "notifications.send": {
    title: "Can send notifications",
    description: "Send an email or in-app notification. (Not built yet.)",
  },
  "permissions.assign": {
    title: "Can assign extra permissions",
    description: "Grant an individual extra permission on top of a role.",
  },
  "permissions.revoke": {
    title: "Can revoke extra permissions",
    description: "Take back an individual extra permission.",
  },
  "roles.assign": {
    title: "Can assign roles",
    description: "Give another user a role.",
  },
  "roles.revoke": {
    title: "Can revoke roles",
    description: "Take a role away from another user.",
  },
  "roles.view": {
    title: "Can view roles",
    description: "See role and permission info for other users.",
  },
  "roles.view_candidates": {
    title: "Can view delegation candidates",
    description: "See the list of people who could be assigned a role.",
  },
  "rubrics.create": {
    title: "Can create rubrics",
    description: "Build a new rubric for a module.",
  },
  "rubrics.delete": {
    title: "Can delete rubrics",
    description: "Permanently remove a rubric or one of its criteria.",
  },
  "rubrics.update": {
    title: "Can edit rubrics",
    description: "Change a rubric or its criteria.",
  },
  "rubrics.view": {
    title: "Can view rubrics",
    description: "Read a module's rubric and its criteria.",
  },
  "schools.create": {
    title: "Can create schools",
    description: "Add a new school.",
  },
  "schools.deactivate": {
    title: "Can deactivate schools",
    description: "Turn off a school without deleting it.",
  },
  "schools.update": {
    title: "Can edit schools",
    description: "Change a school's details.",
  },
  "schools.view": {
    title: "Can view schools",
    description: "See the list of schools.",
  },
  "schools.view_detail": {
    title: "Can view school details",
    description: "See the full detail page for a single school.",
  },
  "submissions.download": {
    title: "Can download submissions",
    description: "Download a student's submitted files.",
  },
  "submissions.upload": {
    title: "Can upload submissions",
    description: "Bulk-upload a batch of student submissions.",
  },
  "submissions.view": {
    title: "Can view submissions",
    description: "See the list of submissions without downloading them.",
  },
  "system.settings.manage": {
    title: "Can manage system settings",
    description: "Change platform-wide settings. (Not built yet.)",
  },
  "users.bulk_import": {
    title: "Can bulk import users",
    description: "Create many user accounts at once from a spreadsheet.",
  },
  "users.create": {
    title: "Can create users",
    description: "Add a new user account.",
  },
  "users.deactivate": {
    title: "Can deactivate users",
    description: "Turn off a user's account so they can't sign in.",
  },
  "users.update": {
    title: "Can edit users",
    description: "Change a user's account details.",
  },
  "users.view": {
    title: "Can view users",
    description: "See the list of user accounts.",
  },
};

/** The "Can ___" friendly title for a permission key — see `PERMISSION_DISPLAY`. */
export function permissionTitle(key: PermissionKey): string {
  return PERMISSION_DISPLAY[key]?.title ?? key;
}

/**
 * The plain-English one-liner for a permission key. Falls back to the live catalogue's own
 * (more technical) description, then the raw key, for anything `PERMISSION_DISPLAY` hasn't
 * been extended to cover — mirrors `grantableExtras`'s "tolerates an unloaded catalogue" spirit.
 */
export function permissionDescription(
  key: PermissionKey,
  catalogue?: readonly PermissionCatalogEntry[],
): string {
  return (
    PERMISSION_DISPLAY[key]?.description ??
    catalogue?.find((entry) => entry.key === key)?.description ??
    key
  );
}

/**
 * Friendly domain buckets for grouping permissions in role-assignment UI — coarser than the
 * backend's `functional`/`administrative` split (which is a code-organisation concern, not
 * something a School/Department Admin creating a user should have to parse) and grouped by what
 * part of the system a permission actually touches. Order here is display order.
 *
 * Confirmed against `.claude/project/backend_verified_RBAC.txt` §8.2: grouping School Admin's 22
 * defaults this way reproduces exactly 6 non-empty groups, in display order — Schools 2,
 * Departments 3, Users 4, Role Management 6, Audit 1, Academic Oversight 6 — the same breakdown
 * Dayshin asked for. Administrative domains lead, academic ones trail (reordered 2026-08-05).
 *
 * Every `PermissionKey` must appear in exactly one bucket — if the backend adds a key, add it
 * here too (same discipline as `PermissionKey` itself and `PERMISSION_DISPLAY`).
 */
const PERMISSION_DOMAINS: { label: string; keys: PermissionKey[] }[] = [
  // Administrative domains lead, academic ones follow (2026-08-05, Dayshin's call) — a
  // System/School/Department Admin reading this list cares about "what do I administer" before
  // "what academic content can I see", and the platform-admin groups are the ones every admin
  // template holds something in, unlike the academic groups below which are mostly read-only for
  // an admin viewer.
  {
    label: "Schools",
    keys: ["schools.view", "schools.view_detail", "schools.create", "schools.update", "schools.deactivate"],
  },
  {
    label: "Departments",
    keys: [
      "departments.view",
      "departments.view_detail",
      "departments.create",
      "departments.update",
      "departments.deactivate",
    ],
  },
  {
    label: "Users",
    keys: ["users.create", "users.view", "users.update", "users.deactivate", "users.bulk_import"],
  },
  {
    label: "Role Management",
    keys: [
      "roles.view",
      "roles.view_candidates",
      "roles.assign",
      "roles.revoke",
      "permissions.assign",
      "permissions.revoke",
    ],
  },
  { label: "Audit", keys: ["audit_logs.view"] },
  { label: "System", keys: ["system.settings.manage", "notifications.send", "calendar.manage"] },
  {
    // Progress/coordination oversight of a module's assessment process — deliberately separate
    // from Rubrics and Marking & Annotations below, which are about the assessment *content* and
    // a marker's own work rather than tracking/coordinating the process.
    label: "Academic Oversight",
    keys: [
      "modules.view",
      "modules.create",
      "modules.update",
      "modules.deactivate",
      "submissions.view",
      "submissions.upload",
      "submissions.download",
      "markers.assign",
      "marking_status.view",
      "discrepancies.view",
      "discrepancies.resolve",
      "grades.view",
      "grades.export",
      "dashboard.view",
      "dashboard.view_own",
    ],
  },
  {
    label: "Rubrics",
    keys: ["rubrics.view", "rubrics.create", "rubrics.update", "rubrics.delete"],
  },
  {
    label: "Marking & Annotations",
    keys: [
      "evaluations.view",
      "evaluations.submit",
      "annotations.view",
      "annotations.create",
      "annotations.update",
      "annotations.delete",
    ],
  },
];

/**
 * Splits a list of permission-bearing items into domain groups (`PERMISSION_DOMAINS` order),
 * dropping empty groups entirely. Generic over the item type so both `RoleTemplatePicker`
 * (grouping plain `PermissionKey`s) and `ExtrasFieldset` (grouping `PermissionCatalogEntry`
 * objects, which it still needs for their `id`s) can share one grouping pass instead of each
 * re-implementing it against a different shape.
 */
export function groupPermissionsByDomain<T>(
  items: readonly T[],
  getKey: (item: T) => PermissionKey,
): { label: string; items: T[] }[] {
  const byKey = new Map(items.map((item) => [getKey(item), item]));
  return PERMISSION_DOMAINS.map((domain) => ({
    label: domain.label,
    items: domain.keys
      .map((key) => byKey.get(key))
      .filter((item): item is T => item !== undefined),
  })).filter((domain) => domain.items.length > 0);
}

/**
 * Friendly role-template descriptions, replacing the backend's own `description` field — which
 * is accurate but reads like an engineering note ("delegated admins, cascading oversight") rather
 * than something to show a System Administrator creating a user. Falls back to the live
 * catalogue's own description for a template this map hasn't been extended to cover.
 */
const ROLE_TEMPLATE_DESCRIPTIONS: Record<RoleTemplateKey, string> = {
  system_administrator:
    "Manages the platform itself — schools, departments, users, and roles — with read-only visibility into academic records for support and troubleshooting. Does not take part in marking or edit academic content.",
  school_admin:
    "Responsible for managing an entire school. Oversees departments, users, and academic progress, but does not participate in marking.",
  department_admin:
    "Responsible for managing a department. Oversees modules, users, and academic progress, but does not participate in marking.",
  project_coordinator:
    "Runs the assessment process for one or more modules — uploading submissions, building rubrics, assigning markers, and resolving discrepancies.",
  marker: "Grades submissions independently, with no visibility into other markers' work or decisions.",
};

/** The friendly description for a role template — see `ROLE_TEMPLATE_DESCRIPTIONS`. Falls back
 * to the live catalogue's own `description` for a template not (yet) covered by the map. */
export function roleTemplateDescription(
  key: RoleTemplateKey,
  catalogueDescription?: string,
): string {
  return ROLE_TEMPLATE_DESCRIPTIONS[key] ?? catalogueDescription ?? key;
}
