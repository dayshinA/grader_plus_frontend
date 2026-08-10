import { ProtectedRoute } from "~/features/auth/components/protected-route";

/**
 * Outer gate for `/marker/*` — the marking queue.
 *
 * `evaluations.submit` is the Marker template's defining permission, held identically at global,
 * school, department or module scope (all four confer the same nine permissions — a marker's real
 * boundary is their `marker_assignments` rows plus `BlindIsolationGuard`, never the scope of this
 * assignment).
 *
 * A **System Administrator does not pass this**, corrected 2026-08-10. The 2026-08-03
 * least-privilege redesign replaced their old "holds every permission in the catalogue" special
 * case with an explicit 32-key allowlist that excludes every action-oriented functional key,
 * `evaluations.submit` among them (`backend_verified_RBAC.txt` §8.1). That is the right outcome:
 * a System Administrator can never be *assigned* as a marker, so the screens underneath would
 * have nothing to show them anyway — they now can't reach them at all rather than reaching an
 * empty list.
 */
export default function RequireMarking() {
  return <ProtectedRoute requirePermissions={["evaluations.submit"]} />;
}
