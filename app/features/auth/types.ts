export type Role = "coordinator" | "marker" | "super_admin";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  /** Seconds until access_token expires — mirrors JWT_EXPIRES_IN (backend, added 2026-07-07). */
  expires_in: number;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
