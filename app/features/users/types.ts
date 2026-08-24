import type { Role, RoleAssignment, ScopeType } from "~/features/access/types";
import type { ImportReport } from "~/types/import-report";

// Read only. `scopeName` comes down because labelling a scope here would need read on every one.
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
  // The scopes the caller reaches, so an empty array means "none you can see".
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

// Carries the temporary passwords, which exist nowhere else in readable form.
export interface BulkImportResult {
  report: ImportReport;
  createdUsers: {
    row: number;
    email: string;
    fullName: string;
    temporaryPassword: string;
  }[];
}
