import { describe, expect, it } from "vitest";
import {
  makeAssignment,
  makeEmptySummary,
  makeSummary,
} from "~/features/permissions/test-support";
import {
  bestHierarchyLevel,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasNoAssignments,
  hasPermission,
  hasPermissionAtScope,
  hasRole,
} from "~/features/permissions/utils";

describe("permission predicates", () => {
  const coordinator = makeSummary(["project_coordinator"], {
    assignments: [
      makeAssignment("project_coordinator", {
        scopeType: "module",
        scopeId: "cs301",
        permissionKeys: ["modules.view", "rubrics.manage", "grades.export"],
      }),
    ],
  });

  it("hasPermission is true only for keys in the union", () => {
    expect(hasPermission(coordinator, "rubrics.manage")).toBe(true);
    expect(hasPermission(coordinator, "users.create")).toBe(false);
  });

  it("hasPermission is false for a null summary rather than throwing", () => {
    expect(hasPermission(null, "modules.view")).toBe(false);
  });

  it("hasAnyPermission is any-of, and an empty list is false", () => {
    expect(hasAnyPermission(coordinator, ["users.create", "grades.export"])).toBe(
      true,
    );
    expect(hasAnyPermission(coordinator, ["users.create"])).toBe(false);
    expect(hasAnyPermission(coordinator, [])).toBe(false);
  });

  it("hasAllPermissions is all-of, and an empty list is vacuously true", () => {
    expect(hasAllPermissions(coordinator, ["modules.view", "grades.export"])).toBe(
      true,
    );
    expect(hasAllPermissions(coordinator, ["modules.view", "users.create"])).toBe(
      false,
    );
    expect(hasAllPermissions(coordinator, [])).toBe(true);
  });

  it("permissionKeys is scope-blind — the union spans every assignment", () => {
    // A Department Admin of CS who also coordinates one Physics module. The
    // union says they hold both sets, with nothing recording which came from
    // where. This is exactly why hasPermission must never be treated as
    // authorisation.
    const both = makeSummary(["department_admin", "project_coordinator"], {
      assignments: [
        makeAssignment("department_admin", {
          scopeType: "department",
          scopeId: "cs",
          permissionKeys: ["users.create"],
        }),
        makeAssignment("project_coordinator", {
          scopeType: "module",
          scopeId: "phy101",
          permissionKeys: ["grades.export"],
        }),
      ],
    });

    expect(hasPermission(both, "users.create")).toBe(true);
    expect(hasPermission(both, "grades.export")).toBe(true);
  });
});

describe("hasPermissionAtScope", () => {
  it("matches an exact scope", () => {
    const summary = makeSummary(["project_coordinator"], {
      assignments: [
        makeAssignment("project_coordinator", {
          scopeType: "module",
          scopeId: "cs301",
          permissionKeys: ["rubrics.manage"],
        }),
      ],
    });

    expect(hasPermissionAtScope(summary, "rubrics.manage", "module", "cs301")).toBe(
      true,
    );
    expect(hasPermissionAtScope(summary, "rubrics.manage", "module", "cs101")).toBe(
      false,
    );
  });

  it("treats a global assignment as containing every scope", () => {
    const superAdmin = makeSummary(["super_admin"], {
      assignments: [
        makeAssignment("super_admin", {
          scopeType: "global",
          scopeId: null,
          permissionKeys: ["modules.update"],
        }),
      ],
    });

    expect(
      hasPermissionAtScope(superAdmin, "modules.update", "module", "anything"),
    ).toBe(true);
  });

  it("requires the permission on the matching assignment, not merely somewhere", () => {
    const summary = makeSummary(["department_admin", "project_coordinator"], {
      assignments: [
        makeAssignment("department_admin", {
          scopeType: "department",
          scopeId: "cs",
          permissionKeys: ["users.create"],
        }),
        makeAssignment("project_coordinator", {
          scopeType: "module",
          scopeId: "cs301",
          permissionKeys: ["rubrics.manage"],
        }),
      ],
    });

    // Held at the module, asked about the department — the union would say yes.
    expect(
      hasPermissionAtScope(summary, "rubrics.manage", "department", "cs"),
    ).toBe(false);
  });

  it("returns false for a real containment hit it cannot see (documented limit)", () => {
    // A School Admin of Science genuinely holds modules.update on every module
    // inside Science, but /role-assignments/me returns bare scope ids with no
    // ancestry, so the client cannot know cs301 is in Science. False here is
    // the safe direction — this helper must not be used to hide anything a
    // broader-scoped admin legitimately reaches.
    const schoolAdmin = makeSummary(["school_admin"], {
      assignments: [
        makeAssignment("school_admin", {
          scopeType: "school",
          scopeId: "science",
          permissionKeys: ["modules.update"],
        }),
      ],
    });

    expect(
      hasPermissionAtScope(schoolAdmin, "modules.update", "module", "cs301"),
    ).toBe(false);
  });
});

describe("role identity", () => {
  const deptAdmin = makeSummary(["department_admin", "project_coordinator"]);

  it("hasRole reads roleTemplateKeys, not permissions", () => {
    expect(hasRole(deptAdmin, "department_admin")).toBe(true);
    expect(hasRole(deptAdmin, "project_coordinator")).toBe(true);
    expect(hasRole(deptAdmin, "super_admin")).toBe(false);
    expect(hasRole(null, "marker")).toBe(false);
  });

  it("hasAnyRole is any-of", () => {
    expect(hasAnyRole(deptAdmin, ["super_admin", "department_admin"])).toBe(true);
    expect(hasAnyRole(deptAdmin, ["super_admin", "marker"])).toBe(false);
    expect(hasAnyRole(deptAdmin, [])).toBe(false);
  });
});

describe("bestHierarchyLevel", () => {
  it("returns the most senior (lowest) level across assignments", () => {
    // The seed's deptadmin@ — Department Admin (2) and module Coordinator (3).
    expect(bestHierarchyLevel(makeSummary(["department_admin", "project_coordinator"]))).toBe(2);
  });

  it("returns 0 for a Super Admin", () => {
    expect(bestHierarchyLevel(makeSummary(["super_admin"]))).toBe(0);
  });

  it("returns null when there are no assignments at all", () => {
    expect(bestHierarchyLevel(makeEmptySummary())).toBeNull();
    expect(bestHierarchyLevel(null)).toBeNull();
  });
});

describe("hasNoAssignments", () => {
  it("is true for an empty summary and for null", () => {
    expect(hasNoAssignments(makeEmptySummary())).toBe(true);
    expect(hasNoAssignments(null)).toBe(true);
  });

  it("is false once any assignment exists", () => {
    expect(hasNoAssignments(makeSummary(["marker"]))).toBe(false);
  });
});
