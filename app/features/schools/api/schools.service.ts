import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type { CoordinatorResponse } from "~/features/departments/types";
import type {
  CreateSchoolRequest,
  SchoolResponse,
  UpdateSchoolRequest,
} from "~/features/schools/types";

/** Raw SchoolsModule endpoint calls — hooks in this folder add React Query orchestration on
 * top. Mutations use `apiWithMessage` (not plain `api`) so the backend's own confirmation
 * message survives to the toast — see SYSTEM_DESIGN.md decision #31. Most of this controller is
 * Super-Admin-only, but `getCoordinators` (below) is also School-Admin-callable. Mirrors
 * `departments.service.ts` 1:1 — see decision #37. */
export const schoolsService = {
  getSchools: (): Promise<SchoolResponse[]> => api.get<SchoolResponse[]>("/schools"),

  /** `@Roles(SUPER_ADMIN, COORDINATOR)` + `SchoolAdminGuard` — a Coordinator caller passes only
   * if they administer `schoolId`. Used by the FR43 department-admin-grant delegation picker on
   * `workspace/school-settings.tsx`. Reuses `CoordinatorResponse` from
   * `~/features/departments/types` — identical shape, same endpoint convention one level up. */
  getCoordinators: (schoolId: string): Promise<CoordinatorResponse[]> =>
    api.get<CoordinatorResponse[]>(`/schools/${schoolId}/coordinators`),

  createSchool: (request: CreateSchoolRequest): Promise<ApiResult<SchoolResponse>> =>
    apiWithMessage.post<SchoolResponse>("/schools", request),

  updateSchool: (
    id: string,
    request: UpdateSchoolRequest,
  ): Promise<ApiResult<SchoolResponse>> =>
    apiWithMessage.patch<SchoolResponse>(`/schools/${id}`, request),

  /** Soft delete (`isActive = false`) — the backend's only "deactivate" mechanism. Reactivate via updateSchool(id, { isActive: true }). */
  deactivateSchool: (id: string): Promise<ApiResult<{ id: string }>> =>
    apiWithMessage.delete<{ id: string }>(`/schools/${id}`),
};
