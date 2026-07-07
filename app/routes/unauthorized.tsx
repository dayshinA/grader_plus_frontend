import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/features/auth/api/auth-context";
import { roleLandingPath } from "~/features/auth/utils";

export function meta() {
  return [{ title: "Unauthorized — GraderPlus" }];
}

export default function Unauthorized() {
  const { user } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        You don't have access to this page
      </h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        Your account doesn't have permission to view that section.
      </p>
      <Button asChild>
        <Link to={user ? roleLandingPath(user.role) : "/login"}>
          Back to your dashboard
        </Link>
      </Button>
    </main>
  );
}
