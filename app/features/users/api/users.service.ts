import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  BulkImportResult,
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

  /** `multipart/form-data`, field name `file` (2MB cap, 500-row cap, `.csv`/`.xlsx` only —
   * enforced server-side; `FileInput`'s caller pre-checks the same caps client-side).
   * Content-Type is deliberately left unset so axios/the browser generates the multipart
   * boundary itself — hand-setting it here would omit the boundary parameter. */
  bulkImportUsers: (file: File): Promise<ApiResult<BulkImportResult>> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiWithMessage.post<BulkImportResult>("/users/bulk-import", formData);
  },
};
