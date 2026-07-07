import { useMutation } from "@tanstack/react-query";
import { authService } from "~/features/auth/api/auth.service";
import { useAuth } from "~/features/auth/api/auth-context";
import type { LoginRequest } from "~/features/auth/types";

export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: (request: LoginRequest) => authService.login(request),
    onSuccess: (data) => {
      login(data);
    },
  });
}
