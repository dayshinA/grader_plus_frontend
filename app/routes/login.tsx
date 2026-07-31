import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/ui/password-input";
import { useLogin } from "~/features/auth/api/use-login";
import { landingPath } from "~/features/auth/utils";
import { ApiError } from "~/lib/api-client";

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          if (!data) return;
          navigate(next ?? landingPath(data.permissions), { replace: true });
        },
      },
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
          GraderPlus
        </h1>

        {login.isError && (
          <div className="mb-4">
            <Alert
              variant="inline"
              timeout={0}
              title="Sign-in failed"
              message={
                login.error instanceof ApiError
                  ? login.error.message
                  : "Something went wrong. Please try again."
              }
            />
          </div>
        )}

        {expired && !login.isError && (
          <div className="mb-4">
            <Alert
              variant="inline"
              timeout={0}
              title="Session expired"
              message="Please sign in again to continue."
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={login.isPending}
            data-loading={login.isPending}
            className="mt-2"
          >
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
