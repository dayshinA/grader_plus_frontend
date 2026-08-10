import { Navigate } from "react-router";
import { Wave } from "~/components/ui/wave";
import { useAuth } from "~/features/auth/api/auth-context";
import { landingPath } from "~/features/auth/utils";

export default function Home() {
  const { user, permissions, isBootstrapping } = useAuth();

  // Same isBootstrapping gate as ProtectedRoute — this route sits outside
  // require-auth.tsx (it has to decide whether to send an unauthenticated
  // visitor to /login or a real user to their dashboard), so it needs its
  // own copy of the check. Without it, a reopened tab lands here before the
  // mount-time silent-refresh resolves, `user` is still null, and this
  // redirects to /login before the session ever gets a chance to recover —
  // and /login doesn't re-check auth state, so the user gets stuck there.
  if (isBootstrapping) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background"
      >
        <Wave className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">Restoring your session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={landingPath(permissions)} replace />;
}
