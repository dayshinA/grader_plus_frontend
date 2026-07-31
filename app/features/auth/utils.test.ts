import { describe, expect, it } from "vitest";
import { landingPath } from "~/features/auth/utils";
import {
  makeAssignment,
  makeEmptySummary,
  makeSummary,
} from "~/features/permissions/test-support";

describe("landingPath", () => {
  it("sends a Super Admin to the admin console", () => {
    expect(landingPath(makeSummary(["super_admin"]))).toBe("/super-admin/users");
  });

  it.each([
    ["school_admin"],
    ["department_admin"],
    ["project_coordinator"],
  ] as const)(
    "sends a %s to the assessment workspace",
    (role) => {
      expect(landingPath(makeSummary([role]))).toBe("/coordinator/dashboard");
    },
  );

  it("sends a Marker to their marking queue", () => {
    expect(landingPath(makeSummary(["marker"]))).toBe("/marker/projects");
  });

  it("picks by seniority when several roles are held", () => {
    // The seed's deptadmin@ — Department Admin (level 2) and a module-scoped
    // Project Coordinator (level 3) at the same time. Precisely the case the
    // old single-`role` model could not represent.
    const deptAdmin = makeSummary(["department_admin", "project_coordinator"]);
    expect(landingPath(deptAdmin)).toBe("/coordinator/dashboard");

    // Super Admin outranks everything, whatever order the keys arrive in.
    expect(landingPath(makeSummary(["marker", "super_admin"]))).toBe(
      "/super-admin/users",
    );
    expect(landingPath(makeSummary(["school_admin", "super_admin"]))).toBe(
      "/super-admin/users",
    );
  });

  it("breaks the level-3 Coordinator/Marker tie toward the workspace", () => {
    // Coordinator and Marker are both level 3 — siblings, neither outranking
    // the other — so seniority alone cannot decide. Someone holding both is
    // far more likely to be coordinating; their marking queue is a nav click
    // away either way.
    const both = makeSummary(["marker", "project_coordinator"]);
    expect(landingPath(both)).toBe("/coordinator/dashboard");
  });

  it("sends a user with no assignments somewhere terminal, not into a loop", () => {
    // Unreachable under the old role enum, reachable now. /unauthorized sits
    // outside the protected tree, so it renders rather than redirecting again.
    expect(landingPath(makeEmptySummary())).toBe("/unauthorized");
    expect(landingPath(null)).toBe("/unauthorized");
  });

  it("does not treat an empty roleTemplateKeys list as senior", () => {
    // Assignments present but no recognised template — only possible if the
    // backend adds a sixth. Must still terminate.
    const unknown = makeSummary([], {
      assignments: [makeAssignment("marker")],
      roleTemplateKeys: [],
    });
    expect(landingPath(unknown)).toBe("/unauthorized");
  });
});
