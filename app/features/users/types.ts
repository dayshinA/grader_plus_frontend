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
