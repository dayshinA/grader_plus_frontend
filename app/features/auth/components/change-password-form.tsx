import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Callout } from "~/components/ui/callout";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { useAuth } from "~/features/auth/api/auth-context";
import { useChangePassword, useLogin } from "~/features/auth/api/use-auth";
import { MINIMUM_PASSWORD_LENGTH } from "~/features/auth/types";
import { isApiError } from "~/lib/api-client";

/**
 * Changing a password revokes every refresh token on the account, so this tab's session is
 * dead the moment it succeeds.
 *
 * The voluntary change signs out here and says why, rather than letting the next request
 * discover it. The forced change cannot do that without asking somebody to sign in twice on
 * their first visit, so it signs back in with the password just set and carries on.
 */
export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const change = useChangePassword();
  const login = useLogin();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const error = change.error ?? login.error;
  const fieldError = (name: string) => (isApiError(error) ? error.fieldError(name) : undefined);

  const mismatch = confirmation.length > 0 && confirmation !== newPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < MINIMUM_PASSWORD_LENGTH;
  const sameAsCurrent = newPassword.length > 0 && newPassword === currentPassword;
  const isPending = change.isPending || login.isPending;

  const email = user?.email ?? session?.email ?? "";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mismatch || tooShort || sameAsCurrent) return;

    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: ({ message }) => {
          if (!forced) {
            toast.success(message || "Password changed. Sign in with the new one.");
            signOut();
            return;
          }

          // The token in memory outlives the change by up to its remaining fifteen minutes,
          // but nothing can renew it, so take a fresh pair rather than drop them at login
          // partway through their first visit.
          login.mutate(
            { email, password: newPassword },
            {
              onSuccess: () => {
                toast.success("Password set. Welcome to GraderPlus.");
                void navigate("/", { replace: true });
              },
              onError: () => {
                toast.success("Password set. Sign in with your new password.");
                signOut();
              },
            },
          );
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {forced ? (
        <Callout variant="warning" title="Set your own password to continue">
          This account is still on the password somebody else set for it. Nothing else opens
          until you replace it.
        </Callout>
      ) : (
        <Callout variant="info">
          Changing your password signs out every other device, including this one. You will be
          asked to sign in again with the new password.
        </Callout>
      )}

      <FormError error={error} />

      <FormField
        label={forced ? "Temporary password" : "Current password"}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        hint={forced ? "The one you were given and just signed in with." : undefined}
        error={fieldError("currentPassword")}
      />

      <FormField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        hint={`At least ${MINIMUM_PASSWORD_LENGTH} characters.`}
        error={
          tooShort
            ? `Use at least ${MINIMUM_PASSWORD_LENGTH} characters.`
            : sameAsCurrent
              ? "Pick something different from your current password."
              : fieldError("newPassword")
        }
      />

      <FormField
        label="Confirm new password"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        required
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        error={mismatch ? "The two passwords do not match." : undefined}
      />

      <SubmitButton
        isPending={isPending}
        pendingLabel={forced ? "Setting password" : "Changing password"}
        disabled={
          mismatch ||
          tooShort ||
          sameAsCurrent ||
          newPassword.length === 0 ||
          currentPassword.length === 0
        }
      >
        {forced ? "Set password and continue" : "Change password"}
      </SubmitButton>
    </form>
  );
}
