import { useMutation } from "@tanstack/react-query";
import { authService } from "~/features/auth/api/auth.service";
import { useAuth } from "~/features/auth/api/auth-context";
import type { LoginRequest } from "~/features/auth/types";

/**
 * Signing in is now genuinely two calls: `POST /auth/login` for the token, then
 * `GET /role-assignments/me` for the roles that decide what the user can even
 * see. Both must succeed, so both live inside `mutationFn` — a failure of
 * either lands in the mutation's error state and renders on the login form, and
 * `isPending` covers the whole thing rather than flipping to done while the
 * summary is still in flight.
 *
 * `login()` makes the second call and rejects if it fails, having already torn
 * the half-established session down (decision #40). It resolves with the
 * summary, which the caller needs in order to pick a landing path.
 */
export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (request: LoginRequest) => {
      const response = await authService.login(request);
      const permissions = await login(response);
      return { response, permissions };
    },
  });
}
