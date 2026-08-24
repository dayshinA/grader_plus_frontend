import { Navigate } from "react-router";

import { AuthShell } from "~/features/auth/components/auth-shell";
import { ChangePasswordForm } from "~/features/auth/components/change-password-form";
import { ProtectedRoute } from "~/features/auth/components/protected-route";
import { useAuth } from "~/features/auth/api/auth-context";
import { useLogout } from "~/features/auth/api/use-auth";

// Outside the app shell: while the flag is set, a sidebar of links that all bounce back is worse.
function SetPasswordScreen() {
  const { mustChangePassword, user, session } = useAuth();
  const logout = useLogout();

  // Reachable only while the flag is set. Once it clears, home is the answer.
  if (!mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  const name = (user?.fullName ?? session?.fullName ?? "").split(" ")[0];

  return (
    <AuthShell
      title={name ? `Welcome, ${name}` : "Set your password"}
      description="Choose a password of your own before you go any further. You will not be asked to sign in again."
      footer={
        <button
          type="button"
          className="underline underline-offset-4 hover:text-foreground disabled:opacity-60"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Sign out instead
        </button>
      }
    >
      <ChangePasswordForm forced />
    </AuthShell>
  );
}

export function SetPasswordPage() {
  return (
    <ProtectedRoute>
      <SetPasswordScreen />
    </ProtectedRoute>
  );
}
