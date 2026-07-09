import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
} from "~/features/users/types";

/** Raw UsersModule endpoint calls (Super Admin only) — hooks in this folder add React Query orchestration on top.
 * Mutations use `apiWithMessage` (not plain `api`) so the backend's own confirmation
 * message survives to the toast — see SYSTEM_DESIGN.md decision #31. */
export const usersService = {
  getUsers: (): Promise<UserResponse[]> => api.get<UserResponse[]>("/users"),

  createUser: (request: CreateUserRequest): Promise<ApiResult<UserResponse>> =>
    apiWithMessage.post<UserResponse>("/users", request),

  updateUser: (id: string, request: UpdateUserRequest): Promise<ApiResult<UserResponse>> =>
    apiWithMessage.patch<UserResponse>(`/users/${id}`, request),

  /** Soft delete (`isActive = false`) — the backend's only "deactivate" mechanism. Reactivate via updateUser(id, { isActive: true }). */
  deactivateUser: (id: string): Promise<ApiResult<{ id: string }>> =>
    apiWithMessage.delete<{ id: string }>(`/users/${id}`),
};
