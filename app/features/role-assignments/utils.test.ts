import { describe, expect, it } from "vitest";
import type {
  PermissionCatalogEntry,
  RoleTemplateCatalogEntry,
} from "~/features/permissions/types";
import {
  makeAssignment,
  makeEmptySummary,
  makeSummary,
} from "~/features/permissions/test-support";
import {
  assignmentContainsScope,
  bestHierarchyLevelAtScope,
  canRevokeAssignment,
  defaultPermissionKeysAt,
  delegatableTemplates,
  grantableExtras,
  groupPermissionsByDomain,
  isScopeFieldError,
  permissionKeysAtScope,
  resolveScopeChain,
  roleAssignmentErrorMessage,
  roleTemplateDescription,
  scopeTypesForTemplate,
} from "~/features/role-assignments/utils";
import { ApiError } from "~/lib/api-client";

// The seeded org shape: School of Science → Computer Science + Physics,
// CS301 in Computer Science. Mirrors the backend seed so the containment
// tests below exercise the real hierarchy rather than an invented one.
const SOURCES = {
  departments: [
    { id: "dept-cs", schoolId: "school-sci" },
    { id: "dept-phys", schoolId: "school-sci" },
    { id: "dept-other", schoolId: "school-arts" },
  ],
  modules: [
    { id: "mod-cs301", departmentId: "dept-cs" },
    { id: "mod-phys101", departmentId: "dept-phys" },
  ],
};

const TEMPLATES: RoleTemplateCatalogEntry[] = [
  {
    id: "t0",
    key: "system_administrator",
    name: "System Administrator",
    description: "",
    hierarchyLevel: 0,
    scopes: [{ scopeType: "global", defaultPermissionKeys: ["users.view"] }],
  },
  {
    id: "t1",
    key: "school_admin",
    name: "School Admin",
    description: "",
    hierarchyLevel: 1,
    scopes: [{ scopeType: "school", defaultPermissionKeys: ["departments.create"] }],
  },
  {
    id: "t2",
    key: "department_admin",
    name: "Department Admin",
    description: "",
    hierarchyLevel: 2,
    scopes: [{ scopeType: "department", defaultPermissionKeys: ["modules.create"] }],
  },
  {
    id: "t3",
    key: "project_coordinator",
    name: "Project Coordinator",
    description: "",
    hierarchyLevel: 3,
    scopes: [
      { scopeType: "department", defaultPermissionKeys: ["modules.create"] },
      { scopeType: "module", defaultPermissionKeys: ["rubrics.update"] },
    ],
  },
  {
    id: "t4",
    key: "marker",
    name: "Marker",
    description: "",
    hierarchyLevel: 3,
    scopes: [
      { scopeType: "global", defaultPermissionKeys: ["evaluations.submit"] },
      { scopeType: "school", defaultPermissionKeys: ["evaluations.submit"] },
      { scopeType: "department", defaultPermissionKeys: ["evaluations.submit"] },
    ],
  },
];

const CATALOGUE: PermissionCatalogEntry[] = [
  { id: "p1", key: "grades.export", category: "functional", description: "Export grades" },
  { id: "p2", key: "markers.assign", category: "functional", description: "Assign markers" },
  { id: "p3", key: "users.create", category: "administrative", description: "Create a user" },
];

// A School Admin of School of Science — the seed's schooladmin@.
const schoolAdmin = makeSummary(["school_admin"], {
  assignments: [
    makeAssignment("school_admin", {
      scopeType: "school",
      scopeId: "school-sci",
      permissionKeys: ["roles.assign", "grades.export", "markers.assign"],
    }),
  ],
});

// The seed's deptadmin@ — Department Admin of CS *and* module-scoped
// Coordinator, the case the old single-role model couldn't represent.
const departmentAdmin = makeSummary(["department_admin", "project_coordinator"], {
  assignments: [
    makeAssignment("department_admin", {
      id: "a-dept",
      scopeType: "department",
      scopeId: "dept-cs",
      permissionKeys: ["roles.assign", "markers.assign"],
    }),
    makeAssignment("project_coordinator", {
      id: "a-coord",
      scopeType: "module",
      scopeId: "mod-cs301",
      permissionKeys: ["grades.export"],
    }),
  ],
});

const superAdmin = makeSummary(["system_administrator"], {
  assignments: [
    makeAssignment("system_administrator", {
      scopeType: "global",
      scopeId: null,
      permissionKeys: ["roles.assign", "users.create", "grades.export"],
    }),
  ],
});

describe("resolveScopeChain", () => {
  it("returns an empty chain for global", () => {
    expect(resolveScopeChain("global", null, SOURCES)).toEqual({});
  });

  it("walks a module up to its department and school", () => {
    expect(resolveScopeChain("module", "mod-cs301", SOURCES)).toEqual({
      moduleId: "mod-cs301",
      departmentId: "dept-cs",
      schoolId: "school-sci",
    });
  });

  it("walks a department up to its school", () => {
    expect(resolveScopeChain("department", "dept-cs", SOURCES)).toEqual({
      departmentId: "dept-cs",
      schoolId: "school-sci",
    });
  });

  it("degrades to the id alone when the lists haven't loaded", () => {
    // The safe direction: an unresolved ancestor means containment falls back
    // to exact match, which under-offers rather than over-offers.
    expect(resolveScopeChain("module", "mod-cs301", {})).toEqual({
      moduleId: "mod-cs301",
      departmentId: undefined,
      schoolId: undefined,
    });
  });
});

describe("assignmentContainsScope", () => {
  const chain = resolveScopeChain("module", "mod-cs301", SOURCES);

  it("a global assignment contains everything", () => {
    expect(
      assignmentContainsScope(
        makeAssignment("system_administrator", { scopeType: "global", scopeId: null }),
        chain,
      ),
    ).toBe(true);
  });

  it("a school assignment contains a module inside that school", () => {
    // This is the case Phase 1's hasPermissionAtScope deliberately can't
    // answer, and the reason this module resolves ancestry at all.
    expect(
      assignmentContainsScope(
        makeAssignment("school_admin", {
          scopeType: "school",
          scopeId: "school-sci",
        }),
        chain,
      ),
    ).toBe(true);
  });

  it("a school assignment does not contain a module in another school", () => {
    expect(
      assignmentContainsScope(
        makeAssignment("school_admin", {
          scopeType: "school",
          scopeId: "school-arts",
        }),
        chain,
      ),
    ).toBe(false);
  });

  it("a sibling department does not contain the module", () => {
    expect(
      assignmentContainsScope(
        makeAssignment("department_admin", {
          scopeType: "department",
          scopeId: "dept-phys",
        }),
        chain,
      ),
    ).toBe(false);
  });
});

describe("bestHierarchyLevelAtScope", () => {
  it("is null when nothing the grantor holds contains the scope", () => {
    const chain = resolveScopeChain("department", "dept-other", SOURCES);
    expect(bestHierarchyLevelAtScope(schoolAdmin, chain)).toBeNull();
  });

  it("finds a School Admin's level at a department inside their school", () => {
    const chain = resolveScopeChain("department", "dept-cs", SOURCES);
    expect(bestHierarchyLevelAtScope(schoolAdmin, chain)).toBe(1);
  });

  it("takes the most senior of several containing assignments", () => {
    // deptadmin@ holds both a level-2 department role and a level-3 module
    // role over CS301; the level-2 one wins.
    const chain = resolveScopeChain("module", "mod-cs301", SOURCES);
    expect(bestHierarchyLevelAtScope(departmentAdmin, chain)).toBe(2);
  });

  it("is null for a user with no assignments at all", () => {
    expect(bestHierarchyLevelAtScope(makeEmptySummary(), {})).toBeNull();
  });
});

describe("permissionKeysAtScope", () => {
  it("unions only the assignments that contain the scope", () => {
    // At Physics, deptadmin@'s CS303-scoped coordinator role doesn't apply and
    // neither does their CS department role — so nothing is held there.
    const physics = resolveScopeChain("department", "dept-phys", SOURCES);
    expect(permissionKeysAtScope(departmentAdmin, physics)).toEqual([]);
  });

  it("includes a narrower assignment's keys when asked about that exact scope", () => {
    const cs301 = resolveScopeChain("module", "mod-cs301", SOURCES);
    expect(permissionKeysAtScope(departmentAdmin, cs301).sort()).toEqual([
      "grades.export",
      "markers.assign",
      "roles.assign",
    ]);
  });
});

describe("delegatableTemplates — Rule 2", () => {
  it("offers only strictly junior templates, never a peer", () => {
    const chain = resolveScopeChain("school", "school-sci", SOURCES);
    const keys = delegatableTemplates(TEMPLATES, schoolAdmin, "school", chain).map(
      (t) => t.key,
    );

    // Marker is valid at school scope; School Admin (a peer, level 1) is not
    // offered, and neither is System Administrator (senior).
    expect(keys).toContain("marker");
    expect(keys).not.toContain("school_admin");
    expect(keys).not.toContain("system_administrator");
  });

  it("lets a School Admin confer Department Admin inside their own school", () => {
    // The single most common delegation in the system, and the one an
    // exact-match containment check would wrongly refuse.
    const chain = resolveScopeChain("department", "dept-cs", SOURCES);
    const keys = delegatableTemplates(TEMPLATES, schoolAdmin, "department", chain).map(
      (t) => t.key,
    );

    expect(keys).toEqual(
      expect.arrayContaining(["department_admin", "project_coordinator", "marker"]),
    );
  });

  it("does not offer a template that isn't valid at the chosen scope type", () => {
    // Prevents 422 INVALID_SCOPE_FOR_ROLE_TEMPLATE rather than catching it
    // after submit: School Admin is a school-scope-only template.
    const chain = resolveScopeChain("department", "dept-cs", SOURCES);
    const keys = delegatableTemplates(TEMPLATES, superAdmin, "department", chain).map(
      (t) => t.key,
    );

    expect(keys).not.toContain("school_admin");
    expect(keys).not.toContain("system_administrator");
  });

  it("offers nothing at a scope the grantor holds no containing role at", () => {
    const chain = resolveScopeChain("department", "dept-other", SOURCES);
    expect(delegatableTemplates(TEMPLATES, schoolAdmin, "department", chain)).toEqual([]);
  });

  it("offers nothing at all to a level-3 grantor — the hierarchy floor", () => {
    const coordinator = makeSummary(["project_coordinator"], {
      assignments: [
        makeAssignment("project_coordinator", {
          scopeType: "module",
          scopeId: "mod-cs301",
        }),
      ],
    });
    const chain = resolveScopeChain("module", "mod-cs301", SOURCES);

    // Marker is also level 3 — equal is not junior, so a Coordinator cannot
    // create a Marker. Permanent state, not a loading one.
    expect(delegatableTemplates(TEMPLATES, coordinator, "module", chain)).toEqual([]);
  });

  it("a Department Admin can confer a Coordinator at their own department", () => {
    const chain = resolveScopeChain("department", "dept-cs", SOURCES);
    const keys = delegatableTemplates(
      TEMPLATES,
      departmentAdmin,
      "department",
      chain,
    ).map((t) => t.key);

    expect(keys).toContain("project_coordinator");
    expect(keys).not.toContain("department_admin");
  });
});

describe("Rule 1 is not applied to template defaults", () => {
  it("a School Admin can grant Marker even though its defaults include a permission they must never hold", () => {
    // This is the bug the backend shipped and reverted on 2026-07-30. If Rule 1
    // were applied to defaults, no admin could ever create a Marker, leaving
    // System Administrator as the only account able to staff a module.
    const chain = resolveScopeChain("school", "school-sci", SOURCES);
    const marker = delegatableTemplates(
      TEMPLATES,
      schoolAdmin,
      "school",
      chain,
    ).find((t) => t.key === "marker");

    expect(marker).toBeDefined();
    expect(defaultPermissionKeysAt(marker!, "school")).toContain("evaluations.submit");
    expect(schoolAdmin.permissionKeys).not.toContain("evaluations.submit");
  });
});

describe("grantableExtras — Rule 1", () => {
  const grantorKeys = ["grades.export", "markers.assign"] as const;

  it("offers only keys the grantor holds", () => {
    const keys = grantableExtras(CATALOGUE, grantorKeys).map((e) => e.key);
    expect(keys).toEqual(["grades.export", "markers.assign"]);
    expect(keys).not.toContain("users.create");
  });

  it("drops keys the assignment already holds, so nothing offered is a no-op", () => {
    const keys = grantableExtras(CATALOGUE, grantorKeys, ["grades.export"]).map(
      (e) => e.key,
    );
    expect(keys).toEqual(["markers.assign"]);
  });

  it("returns nothing when the grantor holds nothing at this scope", () => {
    expect(grantableExtras(CATALOGUE, [])).toEqual([]);
  });

  it("tolerates an unloaded catalogue", () => {
    expect(grantableExtras(undefined, grantorKeys)).toEqual([]);
  });
});

describe("canRevokeAssignment — Rule 2 applies to revocation too", () => {
  it("a School Admin can revoke a Department Admin inside their school", () => {
    const target = makeAssignment("department_admin", {
      scopeType: "department",
      scopeId: "dept-cs",
    });
    expect(canRevokeAssignment(schoolAdmin, target, SOURCES)).toBe(true);
  });

  it("a School Admin cannot revoke a peer School Admin", () => {
    const target = makeAssignment("school_admin", {
      scopeType: "school",
      scopeId: "school-sci",
    });
    expect(canRevokeAssignment(schoolAdmin, target, SOURCES)).toBe(false);
  });

  it("a School Admin cannot revoke anything in another school", () => {
    const target = makeAssignment("marker", {
      scopeType: "department",
      scopeId: "dept-other",
    });
    expect(canRevokeAssignment(schoolAdmin, target, SOURCES)).toBe(false);
  });

  it("nobody can revoke a global System Administrator except a System Administrator", () => {
    const target = makeAssignment("system_administrator", {
      scopeType: "global",
      scopeId: null,
    });
    expect(canRevokeAssignment(schoolAdmin, target, SOURCES)).toBe(false);
    // Not even another System Administrator: level 0 can't be strictly below itself.
    expect(canRevokeAssignment(superAdmin, target, SOURCES)).toBe(false);
  });
});

describe("scopeTypesForTemplate / defaultPermissionKeysAt", () => {
  it("lists the scope types a template declares", () => {
    const coordinator = TEMPLATES.find((t) => t.key === "project_coordinator")!;
    expect(scopeTypesForTemplate(coordinator)).toEqual(["department", "module"]);
  });

  it("returns the defaults for the asked-for scope, not the first one", () => {
    const coordinator = TEMPLATES.find((t) => t.key === "project_coordinator")!;
    expect(defaultPermissionKeysAt(coordinator, "module")).toEqual(["rubrics.update"]);
  });

  it("returns nothing for a scope the template isn't valid at", () => {
    const schoolAdminTemplate = TEMPLATES.find((t) => t.key === "school_admin")!;
    expect(defaultPermissionKeysAt(schoolAdminTemplate, "module")).toEqual([]);
  });
});

describe("error copy", () => {
  const apiError = (code: string, message = "raw backend message") =>
    new ApiError({ success: false, statusCode: 403, code, message });

  it("rewrites the Rule 2 violation into form-appropriate copy", () => {
    expect(roleAssignmentErrorMessage(apiError("ROLE_ASSIGNMENT_HIERARCHY_VIOLATION")))
      .toBe("You can only assign or revoke roles junior to your own at this scope.");
  });

  it("rewrites the Rule 1 violation", () => {
    expect(roleAssignmentErrorMessage(apiError("PERMISSION_NOT_HELD_BY_GRANTOR"))).toBe(
      "You can't grant a permission you don't hold yourself at this scope.",
    );
  });

  it("falls back to the backend's own message for an unmapped code", () => {
    expect(roleAssignmentErrorMessage(apiError("SOMETHING_NEW"))).toBe(
      "raw backend message",
    );
  });

  it("falls back to generic copy for a non-API error", () => {
    expect(roleAssignmentErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("routes only the scope-shaped codes to the scope field", () => {
    expect(isScopeFieldError(apiError("SCOPE_ID_REQUIRED"))).toBe(true);
    expect(isScopeFieldError(apiError("SCOPE_ID_NOT_ALLOWED"))).toBe(true);
    expect(isScopeFieldError(apiError("INVALID_SCOPE_FOR_ROLE_TEMPLATE"))).toBe(true);
    expect(isScopeFieldError(apiError("ROLE_ASSIGNMENT_HIERARCHY_VIOLATION"))).toBe(false);
    expect(isScopeFieldError(new Error("boom"))).toBe(false);
  });
});

describe("groupPermissionsByDomain", () => {
  it("reproduces School Admin's exact 22-default breakdown (backend_verified_RBAC.txt §8.2)", () => {
    // The seeded School Admin default set, verbatim — see permission-catalog.definition.ts:434-458.
    const schoolAdminDefaults = [
      "schools.view",
      "schools.view_detail",
      "departments.create",
      "departments.view",
      "departments.view_detail",
      "modules.view",
      "marking_status.view",
      "dashboard.view",
      "discrepancies.view",
      "grades.view",
      "submissions.view",
      "audit_logs.view",
      "roles.assign",
      "roles.revoke",
      "permissions.assign",
      "permissions.revoke",
      "roles.view_candidates",
      "roles.view",
      "users.create",
      "users.view",
      "users.update",
      "users.deactivate",
    ] as const;

    const groups = groupPermissionsByDomain(schoolAdminDefaults, (key) => key);

    expect(groups.map((g) => ({ label: g.label, count: g.items.length }))).toEqual([
      { label: "Schools", count: 2 },
      { label: "Departments", count: 3 },
      { label: "Users", count: 4 },
      { label: "Role Management", count: 6 },
      { label: "Audit", count: 1 },
      { label: "Academic Oversight", count: 6 },
    ]);
    // Every key is accounted for exactly once, none dropped or duplicated.
    expect(groups.flatMap((g) => g.items).sort()).toEqual([...schoolAdminDefaults].sort());
  });

  it("drops empty domains entirely rather than rendering an empty group", () => {
    const groups = groupPermissionsByDomain(["schools.view"] as const, (key) => key);
    expect(groups).toEqual([{ label: "Schools", items: ["schools.view"] }]);
  });

  it("returns nothing for an empty input", () => {
    expect(groupPermissionsByDomain([], (key: never) => key)).toEqual([]);
  });

  it("works over a richer item shape via the key selector, not just bare keys", () => {
    const entries = [
      { key: "users.create", label: "Create users" },
      { key: "schools.view", label: "View schools" },
    ] as const;

    const groups = groupPermissionsByDomain(entries, (entry) => entry.key);

    expect(groups).toEqual([
      { label: "Schools", items: [{ key: "schools.view", label: "View schools" }] },
      { label: "Users", items: [{ key: "users.create", label: "Create users" }] },
    ]);
  });
});

describe("roleTemplateDescription", () => {
  it("returns the friendly override for a known template", () => {
    expect(roleTemplateDescription("school_admin")).toContain("Responsible for managing an entire school");
  });

  it("falls back to the catalogue's own description for an unmapped key", () => {
    // Cast bypasses the closed RoleTemplateKey union to exercise the fallback path itself —
    // the map is meant to cover all five real keys, so this simulates "backend adds a sixth".
    expect(
      roleTemplateDescription(
        "unknown_role" as Parameters<typeof roleTemplateDescription>[0],
        "raw catalogue description",
      ),
    ).toBe("raw catalogue description");
  });
});
