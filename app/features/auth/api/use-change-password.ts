import { useMutation } from "@tanstack/react-query";
import { authService } from "~/features/auth/api/auth.service";
import { useAuth } from "~/features/auth/api/auth-context";
import type { ChangePasswordRequest } from "~/features/auth/types";

export function useChangePassword() {
  const { markPasswordChanged } = useAuth();

  return useMutation({
    mutationFn: (request: ChangePasswordRequest) =>
      authService.changePassword(request),
    onSuccess: () => {
      markPasswordChanged();
    },
  });
}
