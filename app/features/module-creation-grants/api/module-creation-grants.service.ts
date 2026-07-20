import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  GrantModuleCreationRequest,
  ModuleCreationGrantResponse,
} from "~/features/module-creation-grants/types";

/** Raw AcademicModulePermissionsController endpoint calls (`/departments/:departmentId/module-
 * creation-grants`) — delegable to a Department Admin, unlike `department-admin-grants.service.ts`'s
 * controller. Hooks in this folder add React Query orchestration on top. Mutations use
 * `apiWithMessage` (not plain `api`) so the backend's own confirmation message survives to the
 * toast — see SYSTEM_DESIGN.md decision #31. */
export const moduleCreationGrantsService = {
  /** Deliberately no `?active` filter — this screen shows both active and revoked grants. */
  getGrants: (departmentId: string): Promise<ModuleCreationGrantResponse[]> =>
    api.get<ModuleCreationGrantResponse[]>(`/departments/${departmentId}/module-creation-grants`),

  /** Idempotent-by-target on the backend — also used to re-grant a previously revoked pair. */
  grantModuleCreation: (
    departmentId: string,
    request: GrantModuleCreationRequest,
  ): Promise<ApiResult<ModuleCreationGrantResponse>> =>
    apiWithMessage.post<ModuleCreationGrantResponse>(
      `/departments/${departmentId}/module-creation-grants`,
      request,
    ),

  /** Only blocks *future* module creation in this department — modules the coordinator already
   * owns are completely unaffected (contrast with `revokeDepartmentAdmin`'s live, wide-reaching
   * effect). */
  revokeModuleCreation: (
    departmentId: string,
    coordinatorId: string,
  ): Promise<ApiResult<ModuleCreationGrantResponse>> =>
    apiWithMessage.delete<ModuleCreationGrantResponse>(
      `/departments/${departmentId}/module-creation-grants/${coordinatorId}`,
    ),
};
