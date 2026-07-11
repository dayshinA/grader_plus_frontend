import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  DepartmentAdminGrantResponse,
  GrantDepartmentAdminRequest,
} from "~/features/department-admin-grants/types";

/** Raw DepartmentAdminGrantsController endpoint calls (Super Admin only, never delegable to a
 * Department Admin) — hooks in this folder add React Query orchestration on top. Mutations use
 * `apiWithMessage` (not plain `api`) so the backend's own confirmation message survives to the
 * toast — see SYSTEM_DESIGN.md decision #31. */
export const departmentAdminGrantsService = {
  /** Deliberately no `?active` filter — this screen shows both active and revoked grants. */
  getGrants: (departmentId: string): Promise<DepartmentAdminGrantResponse[]> =>
    api.get<DepartmentAdminGrantResponse[]>(`/departments/${departmentId}/admin-grants`),

  /** Idempotent-by-target on the backend — also used to re-grant a previously revoked pair. */
  grantDepartmentAdmin: (
    departmentId: string,
    request: GrantDepartmentAdminRequest,
  ): Promise<ApiResult<DepartmentAdminGrantResponse>> =>
    apiWithMessage.post<DepartmentAdminGrantResponse>(
      `/departments/${departmentId}/admin-grants`,
      request,
    ),

  /** Live/immediate effect on the backend — not just a future-facing change. */
  revokeDepartmentAdmin: (
    departmentId: string,
    coordinatorId: string,
  ): Promise<ApiResult<DepartmentAdminGrantResponse>> =>
    apiWithMessage.delete<DepartmentAdminGrantResponse>(
      `/departments/${departmentId}/admin-grants/${coordinatorId}`,
    ),
};
