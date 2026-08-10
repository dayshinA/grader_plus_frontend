import { describe, expect, it } from "vitest";

import { visibleNavGroups } from "~/features/dashboard/nav";
import { makeAssignment, makeSummary } from "~/features/permissions/test-support";
import type { PermissionKey, RoleTemplateKey } from "~/features/permissions/types";

/**
 * Nav visibility for the Modules / Module Settings pair.
 *
 * The two entries render the same `ModulesPage` at different altitudes, so exactly one of them
 * must show per viewer. Until 2026-08-10 that was enforced with `superAdminOnly`/
 * `exceptSuperAdmin`, which was correct only while System Administrator was the sole read-only
 * viewer — School Admin became a second one in the backend's 2026-08-03 redesign and was landing
 * on the management entry. It's now decided by whether the viewer holds any module write.
 */

function idsFor(template: RoleTemplateKey, permissionKeys: PermissionKey[]): string[] {
  const summary = makeSummary([template], {
    assignments: [makeAssignment(template, { permissionKeys })],
  });
  return visibleNavGroups(summary).flatMap((group) => group.items.map((item) => item.id));
}

describe("Modules vs Module Settings nav entries", () => {
  it("gives a System Administrator the oversight entry only", () => {
    const ids = idsFor("system_administrator", ["modules.view", "users.view"]);

    expect(ids).toContain("modules");
    expect(ids).not.toContain("module-settings");
  });

  it("gives a School Admin the oversight entry too, not Module Settings", () => {
    const ids = idsFor("school_admin", ["modules.view", "departments.create", "roles.assign"]);

    expect(ids).toContain("modules");
    expect(ids).not.toContain("module-settings");
  });

  it("gives a Department Admin the management entry only", () => {
    const ids = idsFor("department_admin", [
      "modules.view",
      "modules.create",
      "modules.update",
      "modules.deactivate",
    ]);

    expect(ids).toContain("module-settings");
    expect(ids).not.toContain("modules");
  });

  it("gives a module-scoped Coordinator the management entry via modules.update", () => {
    const ids = idsFor("project_coordinator", [
      "modules.view",
      "modules.update",
      "modules.deactivate",
    ]);

    expect(ids).toContain("module-settings");
    expect(ids).not.toContain("modules");
  });

  it("gives a department-scoped Coordinator the management entry on modules.create alone", () => {
    // CH-17: this template holds no `modules.view` at all, so the oversight entry can't apply.
    const ids = idsFor("project_coordinator", ["modules.create", "departments.view"]);

    expect(ids).toContain("module-settings");
    expect(ids).not.toContain("modules");
  });

  it("shows neither to a Marker", () => {
    const ids = idsFor("marker", ["evaluations.submit", "dashboard.view_own"]);

    expect(ids).not.toContain("modules");
    expect(ids).not.toContain("module-settings");
  });
});

/**
 * The read-only academic entries (Rubrics, Discrepancies, Grades), added/corrected 2026-08-10.
 *
 * Each is held by an oversight tier that holds no matching write key, which is exactly what the
 * previous gating got wrong: Rubrics required `rubrics.create` and Grades (then "Export")
 * required `grades.export`, both Coordinator-only, so a Department Admin holding `rubrics.view`
 * and `grades.view` saw neither screen even though the backend serves them both.
 */

/** Department Admin's 23 seeded keys at DEPARTMENT scope — `backend_verified_RBAC.txt` §8.3. */
const DEPARTMENT_ADMIN_KEYS: PermissionKey[] = [
  "schools.view",
  "departments.view",
  "departments.view_detail",
  "modules.create",
  "modules.view",
  "modules.update",
  "modules.deactivate",
  "rubrics.view",
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
];

describe("read-only academic nav entries", () => {
  it("gives a Department Admin Rubrics, Discrepancies and Grades", () => {
    const ids = idsFor("department_admin", DEPARTMENT_ADMIN_KEYS);

    expect(ids).toContain("rubrics");
    expect(ids).toContain("discrepancies");
    expect(ids).toContain("grades");
  });

  it("does not give a Department Admin the entries whose write keys it lacks", () => {
    const ids = idsFor("department_admin", DEPARTMENT_ADMIN_KEYS);

    // `submissions.upload` and `markers.assign` are Coordinator-only, and `submissions.view` —
    // which this role does hold — unlocks no screen, since SubmissionAccessGuard doesn't cascade
    // to a Department Admin.
    expect(ids).not.toContain("submissions");
    expect(ids).not.toContain("marker-assignments");
    expect(ids).not.toContain("my-projects");
    // Organisation-group entries stay System-Administrator-only.
    expect(ids).not.toContain("schools");
    expect(ids).not.toContain("departments");
  });

  it("gives a module-scoped Coordinator the same three, via its write keys", () => {
    const ids = idsFor("project_coordinator", [
      "rubrics.create",
      "rubrics.view",
      "discrepancies.view",
      "discrepancies.resolve",
      "grades.view",
      "grades.export",
      "modules.view",
      "modules.update",
    ]);

    expect(ids).toContain("rubrics");
    expect(ids).toContain("discrepancies");
    expect(ids).toContain("grades");
  });

  it("gives a School Admin Discrepancies and Grades but not Rubrics", () => {
    // School Admin deliberately holds no `rubrics.*` key at all — a rubric belongs to module
    // delivery, one hop below where its oversight sits.
    const ids = idsFor("school_admin", [
      "modules.view",
      "dashboard.view",
      "discrepancies.view",
      "grades.view",
      "submissions.view",
      "users.view",
    ]);

    expect(ids).toContain("discrepancies");
    expect(ids).toContain("grades");
    expect(ids).not.toContain("rubrics");
  });

  it("gives a System Administrator Rubrics and Grades but not Discrepancies-only screens it lacks", () => {
    const ids = idsFor("system_administrator", [
      "modules.view",
      "rubrics.view",
      "grades.view",
      "discrepancies.view",
      "users.view",
    ]);

    expect(ids).toContain("rubrics");
    expect(ids).toContain("grades");
    expect(ids).toContain("discrepancies");
    // Still no module-wide marking board — System Administrator holds no `dashboard.view`.
    expect(ids).not.toContain("dashboard");
  });

  it("shows none of the three to a Marker", () => {
    const ids = idsFor("marker", [
      "evaluations.submit",
      "annotations.create",
      "submissions.download",
      "dashboard.view_own",
    ]);

    expect(ids).not.toContain("rubrics");
    expect(ids).not.toContain("discrepancies");
    expect(ids).not.toContain("grades");
  });
});
