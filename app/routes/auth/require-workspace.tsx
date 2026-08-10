import { ProtectedRoute } from "~/features/auth/components/protected-route";

/**
 * Outer gate for `/workspace/*` — the assessment workspace.
 *
 * Gated on permission, not role (decision #39). The prefix is a section name,
 * not a claim about who the user is: a School Admin and a Department Admin both
 * work out of these screens for their whole scope, and System Administrator's
 * read-only oversight of `modules.view` alone is enough to pass — it no longer
 * holds every functional permission here since the 2026-08-03 least-privilege
 * redesign (it lost `rubrics.*` write, `submissions.upload`, `markers.assign`,
 * `discrepancies.resolve`, `grades.export`, and `dashboard.view`).
 *
 * Deliberately broad and any-of. This answers only "does this person do
 * assessment work at all" — a department-scoped Project Coordinator holding
 * nothing but `modules.create` must pass it, because creating their first
 * module is exactly what they're here to do. Per-screen gating inside the
 * group is what stops them reaching Export.
 */
export default function RequireWorkspace() {
  return (
    <ProtectedRoute
      requirePermissions={[
        "dashboard.view",
        "modules.view",
        "modules.create",
        "rubrics.view",
        "submissions.upload",
        "markers.assign",
        "discrepancies.view",
        // Both grade keys, added 2026-08-10 with the Grades screen: the read half is what
        // Department/School Admin and System Administrator hold, and gating the outer group on
        // the export key alone would have been the same mistake the Rubrics nav entry made.
        "grades.view",
        "grades.export",
      ]}
    />
  );
}
