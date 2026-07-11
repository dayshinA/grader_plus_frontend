import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  AcademicModuleResponse,
  CreateAcademicModuleRequest,
  UpdateAcademicModuleRequest,
} from "~/features/academic-modules/types";

/** Raw AcademicModulesModule endpoint calls (Coordinator + Super Admin) — hooks in this folder
 * add React Query orchestration on top. Mutations use `apiWithMessage` (not plain `api`) so the
 * backend's own confirmation message survives to the toast — see SYSTEM_DESIGN.md decision #31. */
export const academicModulesService = {
  getModules: (): Promise<AcademicModuleResponse[]> =>
    api.get<AcademicModuleResponse[]>("/academic-modules"),

  createModule: (
    request: CreateAcademicModuleRequest,
  ): Promise<ApiResult<AcademicModuleResponse>> =>
    apiWithMessage.post<AcademicModuleResponse>("/academic-modules", request),

  updateModule: (
    id: string,
    request: UpdateAcademicModuleRequest,
  ): Promise<ApiResult<AcademicModuleResponse>> =>
    apiWithMessage.patch<AcademicModuleResponse>(`/academic-modules/${id}`, request),

  /** Soft delete (`isActive = false`) — the backend's only "deactivate" mechanism. Reactivate via updateModule(id, { isActive: true }). */
  deactivateModule: (id: string): Promise<ApiResult<{ id: string }>> =>
    apiWithMessage.delete<{ id: string }>(`/academic-modules/${id}`),
};
