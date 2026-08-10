import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { FormError } from "~/components/ui/form-error";
import { FormField } from "~/components/ui/form-field";
import { SubmitButton } from "~/components/ui/submit-button";
import { AuthShell } from "~/features/auth/components/auth-shell";
import { useLogin } from "~/features/auth/api/use-login";
import { landingPath } from "~/features/auth/utils";
import { isApiError } from "~/lib/api-client";

export function meta() {
  return [{ title: "Sign in — GraderPlus" }];
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const next = searchParams.get("next");
  const expired = searchParams.get("expired") === "1";

  const fieldError = (name: string) =>
    isApiError(login.error) ? login.error.fieldError(name) : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          if (!data) return;
          toast.success("Signed in.");
          navigate(next ?? landingPath(data.permissions), { replace: true });
        },
      },
    );
  }

  return (
    <AuthShell
      title="Sign in"
      description={
        expired && !login.isError
          ? "Your session expired. Sign in again to pick up where you left off."
          : "Use your Loughborough staff account."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError error={login.error} />

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

        <SubmitButton isPending={login.isPending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
