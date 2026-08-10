import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { useAuth } from "~/features/auth/api/auth-context";
import { useChangePassword } from "~/features/auth/api/use-change-password";
import { AuthShell } from "~/features/auth/components/auth-shell";
import { isApiError } from "~/lib/api-client";

export function meta() {
  return [{ title: "Change password — GraderPlus" }];
}

export default function ChangePassword() {
  const { user, logout } = useAuth();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const wasForced = user?.mustChangePassword ?? false;

  const fieldError = (name: string) =>
    isApiError(changePassword.error) ? changePassword.error.fieldError(name) : undefined;

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
          toast.success("Password changed. Sign in again with the new one.");
          logout();
        },
      },
    );
  }

  return (
    <AuthShell
      title="Change your password"
      description={
        wasForced
          ? "Your account was set up with a temporary password. Choose a new one before continuing."
          : "You'll be signed out everywhere once this is saved."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError error={changePassword.error} />

        <FormField
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          error={fieldError("currentPassword")}
        />

        <FormField
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          hint="At least 8 characters."
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          error={fieldError("newPassword")}
        />

        <SubmitButton isPending={changePassword.isPending} pendingLabel="Changing…">
          Change password
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
