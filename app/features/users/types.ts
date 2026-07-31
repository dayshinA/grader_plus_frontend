/**
 * ⚠️ TODO(CH-11/CH-12, Phase 3) — the *request* types below are still the
 * pre-RBAC shapes and are wrong against the current backend. `POST /users` now
 * takes `roleTemplateKey` + `scopeType` + `scopeId?` + `extraPermissionKeys?`
 * (creating a user always bundles a role assignment), and `PATCH /users/:id`
 * rejects any role field outright — role changes go through `/role-assignments`.
 *
 * They're left compiling rather than half-migrated because rewriting the form
 * around the role-template and scope pickers is Phase 3's job, and those pickers
 * don't exist until Phase 2. Creating and editing users is therefore broken
 * against the live backend for exactly as long as that takes; the backend
 * rejects the stale body with a 422, which is loud rather than silent.
 *
 * `UserResponse` below is **not** given the same treatment — see its comment.
 */
export type LegacyRole = "coordinator" | "marker" | "super_admin";

/**
 * `role` is gone, matching the backend: `GET /users` now returns
 * `{ id, email, fullName, learnId, isActive, createdAt }` and there is no batch
 * endpoint that would add roles back. Deliberately not kept as a placeholder —
 * a response field that the API never sends reads as `undefined` at runtime and
 * turns every `user.role` check into a silently-false one, which is far worse
 * than a compile error. Per decision #41, roles are reached from a user row by
 * linking to the delegation screen instead.
 */
export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  learnId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: LegacyRole;
  learnId?: string | null;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  fullName?: string;
  role?: LegacyRole;
  learnId?: string | null;
  isActive?: boolean;
}

export interface BulkImportRowResult {
  /** 1-indexed; header row is row 1, so the first data row is row 2. */
  row: number;
  email: string;
  status: "created" | "error";
  /** Present only when status is "created" — plaintext, one-time, never retrievable again. */
  tempPassword?: string;
  /** Present only when status is "error". */
  error?: string;
}

export interface BulkImportResult {
  totalRows: number;
  createdCount: number;
  errorCount: number;
  results: BulkImportRowResult[];
}
