import { ShieldAlert } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
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
    <main className="flex min-h-dvh flex-col justify-center bg-muted/30 px-4 py-10">
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="py-4">
          <Empty className="px-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldAlert aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {noRoles ? "Your account has no roles yet" : "You don't have access to this page"}
              </EmptyTitle>
              <EmptyDescription>
                {noRoles
                  ? "You're signed in, but no roles have been assigned to your account yet, so there's nothing to show you. Ask an administrator to assign one, then sign in again."
                  : "Your account doesn't have permission to view that section."}
              </EmptyDescription>
            </EmptyHeader>
            <Button asChild className="h-11 cursor-pointer sm:h-9">
              <Link to={destination}>
                {noRoles ? "Back to sign in" : "Back to your dashboard"}
              </Link>
            </Button>
          </Empty>
        </CardContent>
      </Card>
    </main>
  );
}
