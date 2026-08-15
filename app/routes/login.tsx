import { Link } from "react-router";

import { AuthShell } from "~/features/auth/components/auth-shell";
import { LoginForm } from "~/features/auth/components/login-form";

export function meta() {
  return [{ title: "Sign in | GraderPlus" }];
}

export default function LoginRoute() {
  return (
    <AuthShell
      title="Sign in"
      description="Staff accounts only. Students never sign in to GraderPlus."
      footer={
        <Link to="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
          Forgotten your password?
        </Link>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
