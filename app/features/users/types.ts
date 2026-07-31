import type { PermissionKey, RoleTemplateKey, ScopeType } from "~/features/permissions/types";

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

/**
 * Body of `POST /users`. Creating a user always bundles an initial role assignment — mirrors
 * `CreateRoleAssignmentRequest` (minus `userId`, since the user is new) plus the account fields.
 * Verbatim from `src/users/dto/create-user.dto.ts`, read 2026-07-31. Subject to the same Rule 1
 * (extras) / Rule 2 (hierarchy) checks as any standalone grant — see
 * `~/features/role-assignments/utils`'s doc comment. There is no DB transaction backing this: if
 * the bundled role assignment fails, the backend hard-deletes the just-created user row to
 * compensate, so from the UI's perspective the whole operation either succeeds or never happened.
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  roleTemplateKey: RoleTemplateKey;
  scopeType: ScopeType;
  /** Required unless `scopeType` is `"global"`, forbidden when it is. */
  scopeId?: string;
  extraPermissionKeys?: PermissionKey[];
  learnId?: string | null;
}

/**
 * Body of `PATCH /users/:id`. Deliberately **not** `Partial<CreateUserRequest>` — role assignment
 * is its own concern, handled exclusively through `/role-assignments`. A role field here is
 * rejected outright rather than silently ignored.
 */
export interface UpdateUserRequest {
  email?: string;
  password?: string;
  fullName?: string;
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
