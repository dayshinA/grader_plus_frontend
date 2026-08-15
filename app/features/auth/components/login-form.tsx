import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { SET_PASSWORD_PATH } from "~/features/auth/api/auth-context";
import { useLogin } from "~/features/auth/api/use-auth";
import { isApiError } from "~/lib/api-client";

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Set by the route guard when it bounced somebody off a screen they were headed for.
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const error = login.error;
  const fieldError = (name: string) => (isApiError(error) ? error.fieldError(name) : undefined);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: ({ data, message }) => {
          toast.success(message || "Signed in.");
          // A temporary password gets one destination, whatever they were headed for.
          void navigate(data.user.mustChangePassword ? SET_PASSWORD_PATH : from, {
            replace: true,
          });
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError error={error} />

      <FormField
        label="Email address"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        autoFocus
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldError("email")}
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldError("password")}
      />

      <SubmitButton isPending={login.isPending} pendingLabel="Signing in">
        Sign in
      </SubmitButton>
    </form>
  );
}
