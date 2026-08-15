import { useMutation } from "@tanstack/react-query";

import { authService } from "~/features/auth/api/auth.service";
import { useAuth } from "~/features/auth/api/auth-context";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
} from "~/features/auth/types";

/**
 * Every rejection is an ApiError, so a form reads `error.fieldError(name)` for the field
 * messages and `error.message` for the rest. Nothing here renders an error itself.
 */

export function useLogin() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: ({ data }) => signIn(data),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => authService.forgotPassword(payload),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authService.resetPassword(payload),
  });
}

/**
 * Changing a password revokes every refresh token on the account, so the session this tab
 * holds is already dead by the time this resolves. The caller signs out and sends the user
 * back to login rather than pretending the tab survived.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  });
}

export function useLogout() {
  const { signOut } = useAuth();

  return useMutation({
    // The local session goes either way. An already dead token is exactly when logging out
    // matters most, and it is also when this call fails.
    mutationFn: () => authService.logout().catch(() => null),
    onSettled: signOut,
  });
}
