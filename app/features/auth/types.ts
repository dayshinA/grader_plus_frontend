import type { SessionResponse } from "~/lib/api-client";

export type { SessionResponse };

/** Who is signed in, as far as the session is concerned. GET /me has the full record. */
export type SessionUser = SessionResponse["user"];

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/** Matches MINIMUM_PASSWORD_LENGTH in src/auth/password-policy. */
export const MINIMUM_PASSWORD_LENGTH = 12;
