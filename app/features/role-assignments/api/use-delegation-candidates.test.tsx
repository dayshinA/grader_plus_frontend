import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDelegationCandidates } from "~/features/role-assignments/api/use-delegation-candidates";
import { makeAssignment, makeSummary } from "~/features/permissions/test-support";
import type { PermissionKey, RoleTemplateKey } from "~/features/permissions/types";

/**
 * Which narrowing note the delegation picker should be showing.
 *
 * Three cases, and the screen has to tell them apart: the full platform list (System
 * Administrator, no note), the self-filtered list `UsersService.findAll` returns to a
 * School/Department Admin (`isScopeFiltered`), and the Coordinators-only fallback for a grantor
 * without `users.view` at all (`isCoordinatorsOnly`).
 */

const summary = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("~/features/auth/api/auth-context", () => ({
  useAuth: () => ({ permissions: summary.current }),
}));

const emptyQuery = { data: undefined, isLoading: false, isError: false };

vi.mock("~/features/users/api/use-users", () => ({
  usersQueryKey: ["users"],
  useUsers: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock("~/features/schools/api/use-school-coordinators", () => ({
  useSchoolCoordinators: () => emptyQuery,
}));
vi.mock("~/features/departments/api/use-department-coordinators", () => ({
  useDepartmentCoordinators: () => emptyQuery,
}));

function renderAs(template: RoleTemplateKey, permissionKeys: PermissionKey[]) {
  summary.current = makeSummary([template], {
    assignments: [makeAssignment(template, { permissionKeys, scopeType: "school", scopeId: "s1" })],
  });
  return renderHook(() => useDelegationCandidates()).result.current;
}

describe("useDelegationCandidates narrowing flags", () => {
  it("flags nothing for a System Administrator, who really does see every user", () => {
    const result = renderAs("system_administrator", ["users.view", "roles.assign"]);

    expect(result.isCoordinatorsOnly).toBe(false);
    expect(result.isScopeFiltered).toBe(false);
  });

  it("flags the list as scope-filtered for a School Admin", () => {
    const result = renderAs("school_admin", ["users.view", "roles.assign"]);

    expect(result.isCoordinatorsOnly).toBe(false);
    expect(result.isScopeFiltered).toBe(true);
  });

  it("flags the list as scope-filtered for a Department Admin", () => {
    const result = renderAs("department_admin", ["users.view", "roles.assign"]);

    expect(result.isScopeFiltered).toBe(true);
  });

  it("falls back to the Coordinators-only flag without users.view", () => {
    const result = renderAs("project_coordinator", ["users.create", "roles.assign"]);

    expect(result.isCoordinatorsOnly).toBe(true);
    expect(result.isScopeFiltered).toBe(false);
  });
});
