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

/**
 * Project Coordinator's full seeded MODULE-scope set — `backend_verified_RBAC.txt` §8.4 and
 * `API_ACCESS_REFERENCE.txt` Part 4.4, both read directly off backend source.
 *
 * Kept as the complete real list rather than the handful of keys a given assertion needs, so a
 * future catalog change that drops or adds one is caught here rather than in a browser.
 */
const COORDINATOR_MODULE_KEYS: PermissionKey[] = [
  "modules.view",
  "modules.update",
  "modules.deactivate",
  "rubrics.create",
  "rubrics.view",
  "rubrics.update",
  "rubrics.delete",
  "submissions.upload",
  "submissions.download",
  "submissions.view",
  "markers.assign",
  "marking_status.view",
  "dashboard.view",
  "discrepancies.view",
  "discrepancies.resolve",
  "grades.view",
  "grades.export",
  "schools.view",
  "departments.view",
  "users.create",
  "users.view",
  "users.update",
  "roles.view",
  "roles.view_candidates",
  "roles.assign",
  "roles.revoke",
  "evaluations.view",
  "annotations.view",
  "audit_logs.view",
  "notifications.send",
  "calendar.manage",
];

describe("Project Coordinator nav", () => {
  it("gives a module-scoped Coordinator every operational screen", () => {
    const ids = idsFor("project_coordinator", COORDINATOR_MODULE_KEYS);

    expect(ids).toEqual(
      expect.arrayContaining([
        "dashboard",
        "module-settings",
        "rubrics",
        "submissions",
        "marker-assignments",
        "discrepancies",
        "grades",
        "users",
        "role-assignments",
      ]),
    );
  });

  it("does not give a Coordinator My Projects — holding evaluations.view is not marking", () => {
    const ids = idsFor("project_coordinator", COORDINATOR_MODULE_KEYS);

    // `evaluations.view`/`annotations.view` are dead keys for this role: both routes sit behind
    // BlindIsolationGuard, which needs a marker_assignments row, and a module's own coordinator
    // can never be assigned to it (422). The My Projects entry requires `evaluations.submit`,
    // which a Coordinator never holds.
    expect(ids).not.toContain("my-projects");
  });

  it("gives a Coordinator the module management entry, not the read-only oversight one", () => {
    const ids = idsFor("project_coordinator", COORDINATOR_MODULE_KEYS);

    expect(ids).toContain("module-settings");
    expect(ids).not.toContain("modules");
  });

  it("keeps the Organisation group and School Settings away from a Coordinator", () => {
    const ids = idsFor("project_coordinator", COORDINATOR_MODULE_KEYS);

    // `schools.view`/`departments.view` are picker context, not screens — the Organisation
    // entries need the `.create` keys, and School Settings needs `departments.create`.
    expect(ids).not.toContain("schools");
    expect(ids).not.toContain("departments");
    expect(ids).not.toContain("school-settings");
  });

  it("gives a department-scoped Coordinator only Module Settings, none of the module screens", () => {
    // At DEPARTMENT scope the template confers just three keys: create a module here, and see
    // the org chart around it. Nothing module-operational until they actually own one.
    const ids = idsFor("project_coordinator", [
      "modules.create",
      "schools.view",
      "departments.view",
    ]);

    expect(ids).toContain("module-settings");
    expect(ids).not.toContain("submissions");
    expect(ids).not.toContain("marker-assignments");
    expect(ids).not.toContain("rubrics");
    expect(ids).not.toContain("discrepancies");
    expect(ids).not.toContain("grades");
    expect(ids).not.toContain("dashboard");
  });
});

/**
 * Marker's full seeded set — `backend_verified_RBAC.txt` §8.5, read off
 * `permission-catalog.definition.ts`. Nine keys, offered identically at global, school,
 * department and module scope, because the scope decides only who is senior enough to grant the
 * role — never what the marker can reach.
 *
 * Kept as the complete real list rather than the two keys these assertions need, matching the
 * Coordinator block above: a catalog change that adds a key to this template should fail here,
 * not in a browser.
 */
const MARKER_KEYS: PermissionKey[] = [
  "submissions.view",
  "submissions.download",
  "evaluations.view",
  "evaluations.submit",
  "annotations.view",
  "annotations.create",
  "annotations.update",
  "annotations.delete",
  "dashboard.view_own",
];

describe("Marker nav", () => {
  it("shows My Projects and nothing else", () => {
    const ids = idsFor("marker", MARKER_KEYS);

    expect(ids).toEqual(["my-projects"]);
  });

  it("keeps every coordinator and admin screen away from a Marker holding all nine keys", () => {
    const ids = idsFor("marker", MARKER_KEYS);

    // Named individually rather than relying on the toEqual above, so a nav entry added later
    // with a gate a Marker happens to satisfy fails with a message that says which one.
    for (const id of [
      "dashboard",
      "users",
      "role-assignments",
      "schools",
      "departments",
      "modules",
      "module-settings",
      "school-settings",
      "rubrics",
      "submissions",
      "marker-assignments",
      "discrepancies",
      "grades",
    ]) {
      expect(ids).not.toContain(id);
    }
  });

  // `submissions.view`/`submissions.download` are the two keys most likely to be mistaken for a
  // reason to show the Submissions screen. That screen is the coordinator's ZIP import, gated on
  // `submissions.upload`, which no Marker holds — a marker reaches the same files through the
  // project workspace instead.
  it("does not surface the coordinator's Submissions screen on the marker's read keys", () => {
    const ids = idsFor("marker", ["submissions.view", "submissions.download"]);

    expect(ids).not.toContain("submissions");
  });

  // A System Administrator holds the *view* halves of the grading keys but none of the write
  // ones (§8.1), so they must not pick up the marking queue — and can never be assigned as a
  // marker anyway. This is what `require-marking.tsx` gates on.
  it("does not give a System Administrator the marking queue", () => {
    const ids = idsFor("system_administrator", [
      "evaluations.view",
      "annotations.view",
      "submissions.view",
      "rubrics.view",
      "grades.view",
      "users.view",
    ]);

    expect(ids).not.toContain("my-projects");
  });
});
