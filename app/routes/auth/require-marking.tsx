import { ProtectedRoute } from "~/features/auth/components/protected-route";

/**
 * Outer gate for `/marker/*` — the marking queue.
 *
 * `evaluations.submit` is the Marker template's defining permission, held at
 * global, school or department scope (all three confer the same three
 * permissions — a marker's real boundary is their `marker_assignments` rows
 * plus `BlindIsolationGuard`, never the scope of this assignment).
 *
 * Note a Super Admin passes this, holding every permission in the catalogue,
 * even though they can never be *assigned* as a marker. That's consistent with
 * how the backend's own guards treat them and costs nothing — the screens
 * underneath will simply list no assigned students.
 */
export default function RequireMarking() {
  return <ProtectedRoute requirePermissions={["evaluations.submit"]} />;
}
