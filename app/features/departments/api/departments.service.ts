import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  CoordinatorResponse,
  CreateDepartmentRequest,
  DepartmentResponse,
  UpdateDepartmentRequest,
} from "~/features/departments/types";

/** Raw DepartmentsModule endpoint calls — hooks in this folder add React Query orchestration on
 * top. Mutations use `apiWithMessage` (not plain `api`) so the backend's own confirmation
 * message survives to the toast — see SYSTEM_DESIGN.md decision #31. Most of this controller is
 * Super-Admin-only, but `getCoordinators` (below) is also Department-Admin-callable. */
export const departmentsService = {
  getDepartments: (): Promise<DepartmentResponse[]> =>
    api.get<DepartmentResponse[]>("/departments"),

  /** `@Roles(SUPER_ADMIN, COORDINATOR)` + `DepartmentAdminGuard` — a Coordinator caller passes
   * only if they administer `departmentId`. Used by the FR40 module-creation-grant picker on
   * `coordinator/module-settings.tsx`'s Delegate Permissions tab. */
  getCoordinators: (departmentId: string): Promise<CoordinatorResponse[]> =>
    api.get<CoordinatorResponse[]>(`/departments/${departmentId}/coordinators`),

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
