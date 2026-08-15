import { Link } from "react-router";

import { AuthShell } from "~/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "~/features/auth/components/forgot-password-form";

export function meta() {
  return [{ title: "Reset your password | GraderPlus" }];
}

export default function ForgotPasswordRoute() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the address your account uses and we will send a link to set a new password."
      footer={
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
