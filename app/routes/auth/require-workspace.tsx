import { ProtectedRoute } from "~/features/auth/components/protected-route";

/**
 * Outer gate for `/coordinator/*` — the assessment workspace.
 *
 * Gated on permission, not role (decision #39). The prefix is a section name,
 * not a claim about who the user is: a School Admin and a Department Admin both
 * work out of these screens for their whole scope, and a Super Admin holds
 * every functional permission so they are legitimately theirs too.
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
        "rubrics.manage",
        "submissions.upload",
        "markers.assign",
        "discrepancies.view",
        "grades.export",
      ]}
    />
  );
}
