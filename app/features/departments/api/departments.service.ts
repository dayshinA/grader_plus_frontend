import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  CreateDepartmentRequest,
  DepartmentResponse,
  UpdateDepartmentRequest,
} from "~/features/departments/types";

/** Raw DepartmentsModule endpoint calls (Super Admin only) — hooks in this folder add React
 * Query orchestration on top. Mutations use `apiWithMessage` (not plain `api`) so the backend's
 * own confirmation message survives to the toast — see SYSTEM_DESIGN.md decision #31. */
export const departmentsService = {
  getDepartments: (): Promise<DepartmentResponse[]> =>
    api.get<DepartmentResponse[]>("/departments"),

  createDepartment: (
    request: CreateDepartmentRequest,
  ): Promise<ApiResult<DepartmentResponse>> =>
    apiWithMessage.post<DepartmentResponse>("/departments", request),

  updateDepartment: (
    id: string,
    request: UpdateDepartmentRequest,
  ): Promise<ApiResult<DepartmentResponse>> =>
    apiWithMessage.patch<DepartmentResponse>(`/departments/${id}`, request),

  /** Soft delete (`isActive = false`) — the backend's only "deactivate" mechanism. Reactivate via updateDepartment(id, { isActive: true }). */
  deactivateDepartment: (id: string): Promise<ApiResult<{ id: string }>> =>
    apiWithMessage.delete<{ id: string }>(`/departments/${id}`),
};
