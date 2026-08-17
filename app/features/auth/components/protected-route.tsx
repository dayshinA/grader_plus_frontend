import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";

import { Button } from "~/components/ui/button";
import { ErrorCard } from "~/components/ui/error-card";
import {
  SET_PASSWORD_PATH,
  LOGIN_PATH,
  useAuth,
} from "~/features/auth/api/auth-context";
import { useLogout } from "~/features/auth/api/use-auth";

function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
      <Loader2
        className="size-5 animate-spin text-muted-foreground motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * The gate every signed in screen sits behind, used as a layout route.
 *
 * Three things have to settle before a screen renders: the session recovery attempt, then
 * `GET /me` and `GET /me/permissions`. The permissions call failing is fatal, because the
 * whole navigation is built from it and a shell rendered without it would silently show
 * nothing rather than say why.
 *
 * This is the only place a lost session redirects. Logout and the 401 handler clear state
 * and leave the navigating to here.
 */
export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    isResolvingIdentity,
    identityError,
    mustChangePassword,
    sessionEnd,
  } = useAuth();
  const location = useLocation();
  const logout = useLogout();

  // Memoised: <Navigate> re-runs its effect when `state` changes identity, and a fresh
  // object literal every render is a navigation loop.
  const redirectState = useMemo(
    () => ({
      from: `${location.pathname}${location.search}`,
      // The destination belongs to whoever was interrupted, so the login form can refuse
      // to resume it for a different account.
      userId: sessionEnd?.userId ?? null,
    }),
    [location.pathname, location.search, sessionEnd],
  );

  if (isLoading) {
    return <FullPageSpinner label="Checking your session" />;
  }

  if (!isAuthenticated) {
    // A deliberate sign out ends the account's navigation history. Only a lost session
    // keeps the interrupted destination, for its owner to resume after signing back in.
    return (
      <Navigate to={LOGIN_PATH} replace state={sessionEnd?.deliberate ? null : redirectState} />
    );
  }

  if (identityError) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorCard
            title="Could not load your account"
            error={identityError}
            description="GraderPlus builds every screen from what you are allowed to do, so it cannot continue without that answer."
            action={
              <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
                Sign out
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  if (isResolvingIdentity) {
    return <FullPageSpinner label="Loading your account" />;
  }

  // A temporary password gets one screen and nothing else until it is replaced. That
  // screen sits outside this layout, so nothing renders around it.
  if (mustChangePassword && location.pathname !== SET_PASSWORD_PATH) {
    return <Navigate to={SET_PASSWORD_PATH} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}

/**
 * A screen that needs a permission the caller may not hold. Renders the refusal rather
 * than a not found, because the two mean different things and the UI is the last place
 * that distinction can be thrown away.
 */
export function RequirePermission({
  allowed,
  what,
  children,
}: {
  allowed: boolean;
  /** Named in the refusal, for example "the platform audit log". */
  what: string;
  children: React.ReactNode;
}) {
  if (!allowed) {
    return (
      <ErrorCard
        title="You do not have access to this"
        description={`Your account holds no role that covers ${what}. If that looks wrong, ask whoever granted your roles.`}
      />
    );
  }
  return <>{children}</>;
}
