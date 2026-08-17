import { Link } from "react-router";

import { AuthShell } from "~/features/auth/components/auth-shell";
import { ResetPasswordForm } from "~/features/auth/components/reset-password-form";

export function meta() {
  return [{ title: "Set a new password | GraderPlus" }];
}

export default function ResetPasswordRoute() {
  return (
    <AuthShell
      title="Set a new password"
      description="This link works once. Setting a password here signs the account out everywhere."
      footer={
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
