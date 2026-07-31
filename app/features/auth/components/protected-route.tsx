import { Navigate, Outlet, useLocation } from "react-router";
import { LoaderOne } from "~/components/ui/loader-one";
import { useAuth } from "~/features/auth/api/auth-context";
import { hasAnyPermission, hasAnyRole } from "~/features/permissions/utils";
import type {
  PermissionKey,
  RoleTemplateKey,
} from "~/features/permissions/types";

interface ProtectedRouteProps {
  /**
   * Role templates allowed here. **Any-of** — holding any one of them passes.
   * Use for gates that are genuinely about *who someone is* rather than what
   * they can reach.
   */
  requireRoles?: RoleTemplateKey[];
  /**
   * Permissions allowed here. **Any-of** — holding any one of them passes.
   * Checked scope-blind against the summary's `permissionKeys`, so this answers
   * "does this person do this kind of work at all", not "may they touch this
   * particular module". The server decides the latter, per request.
   */
  requirePermissions?: PermissionKey[];
}

/**
 * Navigation/UX gating only — never a security boundary. Every real data
 * boundary is enforced server-side by `PermissionGuard`, `BlindIsolationGuard`
 * and `SubmissionAccessGuard`; a hidden route here protects nothing on its own.
 *
 * Semantics: **any-of within each prop, and-ed across the two.** Passing both
 * `requireRoles` and `requirePermissions` means the user needs one of the roles
 * *and* one of the permissions. Omit both to allow any authenticated user.
 */
export function ProtectedRoute({
  requireRoles,
  requirePermissions,
}: ProtectedRouteProps) {
  const { user, permissions, isBootstrapping } = useAuth();
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

  // Should be unreachable: `permissions` is set and cleared in lockstep with
  // `user` (decision #40 makes a failed /role-assignments/me tear the session
  // down). Kept because the type is nullable, and a null summary silently
  // passing every gate below would be the worst possible failure mode here.
  if (!permissions) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}&expired=1`} replace />;
  }

  if (requireRoles && !hasAnyRole(permissions, requireRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requirePermissions && !hasAnyPermission(permissions, requirePermissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
