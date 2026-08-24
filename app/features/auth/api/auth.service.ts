import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult, SessionResponse } from "~/lib/api-client";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
} from "~/features/auth/types";

export const authService = {
  /** Access token in the body, refresh token set as an httpOnly cookie. */
  login(payload: LoginPayload): Promise<ApiResult<SessionResponse>> {
    return apiWithMessage.post<SessionResponse>("/auth/login", payload);
  },

  // Answers the same either way, so do not word the UI as though success means an account exists.
  forgotPassword(payload: ForgotPasswordPayload): Promise<ApiResult<null>> {
    return apiWithMessage.post<null>("/auth/forgot-password", payload);
  },

  /** The token works once. Using it ends every session on the account. */
  resetPassword(payload: ResetPasswordPayload): Promise<ApiResult<null>> {
    return apiWithMessage.post<null>("/auth/reset-password", payload);
  },

  /** Revokes every refresh token on the account, so the caller has to sign in again. */
  changePassword(payload: ChangePasswordPayload): Promise<ApiResult<{ id: string }>> {
    return apiWithMessage.post<{ id: string }>("/auth/change-password", payload);
  },

  logout(): Promise<null> {
    return api.post<null>("/auth/logout");
  },
};
