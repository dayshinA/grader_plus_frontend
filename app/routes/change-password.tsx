import { useState, type FormEvent } from "react";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useAuth } from "~/features/auth/api/auth-context";
import { useChangePassword } from "~/features/auth/api/use-change-password";
import { ApiError } from "~/lib/api-client";

export function meta() {
  return [{ title: "Change password — GraderPlus" }];
}

export default function ChangePassword() {
  const { user, logout } = useAuth();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const wasForced = user?.mustChangePassword ?? false;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        // A successful change revokes every refresh token for this user
        // server-side (see front-end-back-end-guide.md §4.1) — the current
        // access token still works until its natural expiry, but no refresh
        // is possible anywhere afterward, so log out immediately and force
        // a fresh login rather than let the session quietly die later.
        onSuccess: () => {
          logout();
        },
      },
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-xl font-semibold text-foreground">
          Change your password
        </h1>
        {wasForced && (
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Your account was set up with a temporary password. Choose a new
            one before continuing.
          </p>
        )}

        {changePassword.isError && (
          <div className="mb-4">
            <Alert
              variant="inline"
              timeout={0}
              title="Couldn't change password"
              message={
                changePassword.error instanceof ApiError
                  ? changePassword.error.message
                  : "Something went wrong. Please try again."
              }
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={changePassword.isPending} className="mt-2">
            {changePassword.isPending ? "Changing..." : "Change password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
