import type {
  PermissionKey,
  RoleTemplateKey,
  ScopeType,
  UserPermissionsSummary,
  UserRoleAssignmentDetail,
} from "~/features/permissions/types";

/**
 * Factories for `GET /role-assignments/me` payloads, shared across test files.
 *
 * Almost every component in this app now reads the RBAC summary, so almost
 * every test needs one. Building them by hand per file meant four copies of the
 * same 20-line literal drifting apart.
 */

/** Hierarchy levels as seeded by the backend. Lower is more senior. */
export const HIERARCHY_LEVELS: Record<RoleTemplateKey, number> = {
  super_admin: 0,
  school_admin: 1,
  department_admin: 2,
  project_coordinator: 3,
  marker: 3,
};

export function makeAssignment(
  roleTemplateKey: RoleTemplateKey,
  overrides: Partial<UserRoleAssignmentDetail> = {},
): UserRoleAssignmentDetail {
  return {
    id: `assignment-${roleTemplateKey}`,
    userId: "u1",
    roleTemplateKey,
    roleTemplateName: roleTemplateKey,
    hierarchyLevel: HIERARCHY_LEVELS[roleTemplateKey],
    scopeType: "global" as ScopeType,
    scopeId: null,
    grantedBy: null,
    grantedAt: "2026-07-31T00:00:00.000Z",
    permissionKeys: [],
    extraPermissionKeys: [],
    ...overrides,
  };
}

/**
 * A summary holding the given templates. `permissionKeys` is derived as the
 * union across the assignments, exactly as the backend computes it — so a test
 * that sets per-assignment `permissionKeys` gets a consistent union for free.
 */
export function makeSummary(
  roleTemplateKeys: RoleTemplateKey[],
  overrides: Partial<UserPermissionsSummary> = {},
): UserPermissionsSummary {
  const assignments =
    overrides.assignments ??
    roleTemplateKeys.map((key) => makeAssignment(key));

  const derivedPermissionKeys = [
    ...new Set(assignments.flatMap((assignment) => assignment.permissionKeys)),
  ] as PermissionKey[];

  return {
    userId: "u1",
    roleTemplateKeys,
    assignments,
    permissionKeys: derivedPermissionKeys,
    ...overrides,
  };
}

/** A summary for a user who can log in but holds nothing — now a reachable state. */
export function makeEmptySummary(): UserPermissionsSummary {
  return {
    userId: "u1",
    roleTemplateKeys: [],
    assignments: [],
    permissionKeys: [],
  };
}

/** Wraps a payload in the backend's success envelope, which api-client unwraps. */
export function envelope(data: unknown): Response {
  return new Response(
    JSON.stringify({
      success: true,
      statusCode: 200,
      code: "OK",
      message: "OK",
      data,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** The 401 envelope the backend returns for a missing/expired refresh cookie. */
export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "Invalid or expired refresh token",
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * A `fetch` stub that answers `GET /role-assignments/me` with `summary` and
 * 401s everything else (so the mount-time bootstrap refresh fails quietly, the
 * default state for a test that logs in explicitly).
 *
 * Pass `summary: null` to make `/me` itself fail — the decision #40 path.
 */
export function stubFetchWithSummary(
  summary: UserPermissionsSummary | null,
): (input: unknown) => Promise<Response> {
  return (input: unknown) => {
    const url = String(
      typeof input === "string" ? input : (input as Request)?.url ?? "",
    );
    if (url.includes("/role-assignments/me")) {
      return Promise.resolve(
        summary ? envelope(summary) : unauthorizedResponse(),
      );
    }
    return Promise.resolve(unauthorizedResponse());
  };
}
