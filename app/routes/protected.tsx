import { ProtectedRoute } from "~/features/auth/components/protected-route";
import { AppShell } from "~/features/dashboard/components/app-shell";

// Layout route: everything under this needs a session and renders inside the shell.
export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}
