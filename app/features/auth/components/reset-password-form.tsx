import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Callout } from "~/components/ui/callout";
import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { LOGIN_PATH } from "~/features/auth/api/auth-context";
import { useResetPassword } from "~/features/auth/api/use-auth";
import { MINIMUM_PASSWORD_LENGTH } from "~/features/auth/types";
import { isApiError } from "~/lib/api-client";

/** The token arrives in the link as `?token=`, so a pasted URL works and a bare visit does not. */
export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reset = useResetPassword();

  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const error = reset.error;
  const fieldError = (name: string) => (isApiError(error) ? error.fieldError(name) : undefined);

  const mismatch = confirmation.length > 0 && confirmation !== newPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < MINIMUM_PASSWORD_LENGTH;

  if (!token) {
    return (
      <Callout variant="warning" title="This link is incomplete">
        Part of the link is missing. Open it straight from the email rather than
        retyping it, or{" "}
        <Link to="/forgot-password" className="underline underline-offset-4">
          request a new one
        </Link>
        .
      </Callout>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mismatch || tooShort) return;

    reset.mutate(
      { token, newPassword },
      {
        onSuccess: ({ message }) => {
          toast.success(message || "Password set. Sign in with it.");
          void navigate(LOGIN_PATH, { replace: true });
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError error={error} />

      <FormField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        autoFocus
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        hint={`At least ${MINIMUM_PASSWORD_LENGTH} characters.`}
        error={tooShort ? `Use at least ${MINIMUM_PASSWORD_LENGTH} characters.` : fieldError("newPassword")}
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
        isPending={reset.isPending}
        pendingLabel="Setting password"
        disabled={mismatch || tooShort || newPassword.length === 0}
      >
        Set password
      </SubmitButton>
    </form>
  );
}
