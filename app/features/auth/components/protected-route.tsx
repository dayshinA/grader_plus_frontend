import { Navigate, Outlet, useLocation } from "react-router";
import { LoaderOne } from "~/components/ui/loader-one";
import { useAuth } from "~/features/auth/api/auth-context";
import type { Role } from "~/features/auth/types";

interface ProtectedRouteProps {
  /** Roles allowed on this section. Omit to allow any authenticated role. */
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  // Silent session recovery (a mount-time /auth/refresh attempt) is still in
  // flight — hold off on redirecting to /login so a real, valid session
  // isn't bounced through the login screen on every hard reload.
  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderOne label="Restoring your session" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}&expired=1`} replace />;
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
