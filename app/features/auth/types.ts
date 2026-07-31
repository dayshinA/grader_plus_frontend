/**
 * No `role` field, deliberately. The backend deleted `users.role` in its
 * 2026-07-29/30 RBAC redesign: the JWT payload is now `{ sub, email }` and the
 * login response's `user` object carries no role either. A user holds a *list*
 * of role templates, each at a scope, and the only way to learn any of it is
 * `GET /role-assignments/me` — see `~/features/permissions/`.
 *
 * Do not add a `Role` type back here to keep older code compiling. That type
 * being gone is what forces every stale role check to surface as a compile
 * error instead of a silently-wrong runtime check.
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
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
