import { Navigate } from "react-router";
import { LoaderOne } from "~/components/ui/loader-one";
import { useAuth } from "~/features/auth/api/auth-context";
import { roleLandingPath } from "~/features/auth/utils";

export default function Home() {
  const { user, isBootstrapping } = useAuth();

  // Same isBootstrapping gate as ProtectedRoute — this route sits outside
  // require-auth.tsx (it has to decide whether to send an unauthenticated
  // visitor to /login or a real user to their dashboard), so it needs its
  // own copy of the check. Without it, a reopened tab lands here before the
  // mount-time silent-refresh resolves, `user` is still null, and this
  // redirects to /login before the session ever gets a chance to recover —
  // and /login doesn't re-check auth state, so the user gets stuck there.
  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderOne label="Restoring your session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={roleLandingPath(user.role)} replace />;
}
