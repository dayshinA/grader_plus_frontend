import { useMutation } from "@tanstack/react-query";

import { authService } from "~/features/auth/api/auth.service";
import { useAuth } from "~/features/auth/api/auth-context";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
} from "~/features/auth/types";

// Every rejection is an ApiError, so forms read fieldError(name). Nothing here renders one.

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

// The session is dead by the time this resolves, so the caller signs out.
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  });
}

export function useLogout() {
  const { signOut } = useAuth();

  return useMutation({
    // A dead token is when logging out matters most, and also when this call fails.
    mutationFn: () => authService.logout().catch(() => null),
    onSettled: signOut,
  });
}
