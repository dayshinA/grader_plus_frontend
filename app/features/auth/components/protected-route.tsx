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

// The gate every signed in screen sits behind, and the only place a lost session redirects.
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

  // Memoised: a fresh object literal every render makes <Navigate> loop.
  const redirectState = useMemo(
    () => ({
      from: `${location.pathname}${location.search}`,
      // So the login form can refuse to resume the destination for a different account.
      userId: sessionEnd?.userId ?? null,
    }),
    [location.pathname, location.search, sessionEnd],
  );

  if (isLoading) {
    return <FullPageSpinner label="Checking your session" />;
  }

  if (!isAuthenticated) {
    // A deliberate sign out drops the interrupted destination. Only a lost session keeps it.
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

  // A temporary password gets one screen and nothing else. It sits outside this layout.
  if (mustChangePassword && location.pathname !== SET_PASSWORD_PATH) {
    return <Navigate to={SET_PASSWORD_PATH} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}

/** A screen the caller may not hold the permission for. Renders the refusal, not a not found. */
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
