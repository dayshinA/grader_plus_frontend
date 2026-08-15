import { ProtectedRoute } from "~/features/auth/components/protected-route";
import { AppShell } from "~/features/dashboard/components/app-shell";

/**
 * Layout route. Everything nested under this needs a session, and renders inside the
 * sidebar and top bar the shell provides.
 */
export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}
