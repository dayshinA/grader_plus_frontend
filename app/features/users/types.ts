import type { RoleAssignment } from "~/features/access/types";

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
