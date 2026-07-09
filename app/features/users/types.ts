import type { Role } from "~/features/auth/types";

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  learnId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  learnId?: string | null;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  fullName?: string;
  role?: Role;
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
