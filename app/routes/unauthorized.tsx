import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/features/auth/api/auth-context";
import { landingPath } from "~/features/auth/utils";
import { hasNoAssignments } from "~/features/permissions/utils";

export function meta() {
  return [{ title: "Unauthorized — GraderPlus" }];
}

export default function Unauthorized() {
  const { user, permissions } = useAuth();

  // A signed-in user holding no role assignments at all. Unreachable under the
  // old role enum (every account had exactly one role); reachable now — every
  // assignment revoked, or an account whose bundled assignment was rolled back
  // server-side. They need different copy: nothing is wrong with the page they
  // asked for, their account simply confers nothing yet.
  const noRoles = user !== null && hasNoAssignments(permissions);

  // `landingPath` returns /unauthorized for exactly this user, so the usual
  // link would be a button that reloads the page it's already on. Signing in
  // again is the only thing that picks up a newly-granted role.
  const destination = !user || noRoles ? "/login" : landingPath(permissions);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        {noRoles
          ? "Your account has no roles yet"
          : "You don't have access to this page"}
      </h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        {noRoles
          ? "You're signed in, but no roles have been assigned to your account yet, so there's nothing to show you. Ask an administrator to assign one, then sign in again."
          : "Your account doesn't have permission to view that section."}
      </p>
      <Button asChild>
        <Link to={destination}>
          {noRoles ? "Back to sign in" : "Back to your dashboard"}
        </Link>
      </Button>
    </main>
  );
}
