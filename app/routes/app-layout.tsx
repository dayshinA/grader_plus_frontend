import { AppShell } from "~/features/dashboard/components/app-shell";
import { useAuth } from "~/features/auth/api/auth-context";

/**
 * Layout route for every signed-in screen. Thin by design — the frame itself (sidebar, top bar,
 * breadcrumb) is `AppShell`, and the nav map it renders lives in `features/dashboard/nav.ts`.
 */
export default function AppLayout() {
  const { user } = useAuth();

  if (!user) {
    // `require-auth` (an ancestor route) guarantees a user exists before this layout renders.
    return null;
  }

  return <AppShell />;
}
