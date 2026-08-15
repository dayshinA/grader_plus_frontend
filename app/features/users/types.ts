import type { Role, RoleAssignment, ScopeType } from "~/features/access/types";

/**
 * One grant on an account, flattened for display, as it arrives on `GET /users` and
 * `GET /users/:id`. These are not `RoleAssignment` rows: there is no `grantedAt`,
 * `grantedBy` or `revokedAt` on them, and they exist to be read rather than acted on.
 *
 * `scopeName` is the academic unit's name, or "<module code> <academic year>" for an
 * offering, and null for a system wide grant. It comes down with the response because
 * labelling a scope in the browser would need the caller to hold `unit.read` and
 * `offering.read` over every scope in the list, which a coordinator does not.
 */
export interface UserRoleSummary {
  id: string;
  role: Role;
  scopeType: ScopeType;
  scopeId: string | null;
  scopeName: string | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  /** Set on an account somebody else created, cleared when the holder sets their own. */
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Active grants only, and only the ones the caller's own scope reaches, so an empty
   * array means "none you can see" rather than "none held". Only a caller with a system
   * wide grant can read it as genuinely unplaced.
   *
   * Present on `GET /users` and `GET /users/:id` and nowhere else: `/me`, create, update,
   * deactivate and bulk import all answer without it.
   */
  roles?: UserRoleSummary[];
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  /** Every account is created with its first role, so the grant is part of the request. */
  role: {
    role: string;
    scopeType: string;
    scopeId?: string;
  };
  /** Omit to have one generated and returned once. */
  temporaryPassword?: string;
}

/** `POST /users` answers with the account, its first grant, and the password if generated. */
export interface CreatedUser {
  user: User;
  assignment: RoleAssignment;
  temporaryPassword?: string;
}

export interface UpdateUserPayload {
  email?: string;
  fullName?: string;
}

export interface UpdateMePayload {
  fullName?: string;
}

/** `POST /users/bulk-import`. Rows that failed are named; rows that worked carry a password. */
export interface BulkImportResult {
  created: {
    row: number;
    email: string;
    fullName: string;
    temporaryPassword: string;
  }[];
  failed: { row: number; email: string; reason: string }[];
}
