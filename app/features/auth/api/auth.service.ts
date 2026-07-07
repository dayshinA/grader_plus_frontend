import { api } from "~/lib/api-client";
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
} from "~/features/auth/types";

/**
 * Raw AuthModule endpoint calls — hooks in this folder add React Query
 * orchestration on top. No `refresh()` here on purpose: `~/lib/api-client`
 * exports its own `refreshSession()`, which is the *only* thing that should
 * ever call POST /auth/refresh — it single-flights concurrent callers
 * (bootstrap, the proactive timer, the 401 interceptor). A second entry
 * point calling the endpoint directly could race it and trip the backend's
 * reuse-detection (see api-client.ts).
 */
export const authService = {
  login: (credentials: LoginRequest): Promise<LoginResponse> =>
    api.post<LoginResponse>("/auth/login", credentials),

  changePassword: (request: ChangePasswordRequest): Promise<{ id: string }> =>
    api.post<{ id: string }>("/auth/change-password", request),

  logout: (): Promise<null> => api.post<null>("/auth/logout"),
};
