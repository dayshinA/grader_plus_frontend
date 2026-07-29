import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";
import type {
  GrantSchoolAdminRequest,
  SchoolAdminGrantResponse,
} from "~/features/school-admin-grants/types";

/** Raw SchoolAdminGrantsController endpoint calls (Super Admin only, never delegable to anyone
 * — not even a School Admin themselves) — hooks in this folder add React Query orchestration on
 * top. Mutations use `apiWithMessage` (not plain `api`) so the backend's own confirmation
 * message survives to the toast — see SYSTEM_DESIGN.md decision #31. Mirrors
 * `department-admin-grants.service.ts` 1:1 — see decision #37. */
export const schoolAdminGrantsService = {
  /** Deliberately no `?active` filter — this screen shows both active and revoked grants. */
  getGrants: (schoolId: string): Promise<SchoolAdminGrantResponse[]> =>
    api.get<SchoolAdminGrantResponse[]>(`/schools/${schoolId}/admin-grants`),

  /** Idempotent-by-target on the backend — also used to re-grant a previously revoked pair. */
  grantSchoolAdmin: (
    schoolId: string,
    request: GrantSchoolAdminRequest,
  ): Promise<ApiResult<SchoolAdminGrantResponse>> =>
    apiWithMessage.post<SchoolAdminGrantResponse>(`/schools/${schoolId}/admin-grants`, request),

  /** Live/immediate effect on the backend — not just a future-facing change. */
  revokeSchoolAdmin: (
    schoolId: string,
    coordinatorId: string,
  ): Promise<ApiResult<SchoolAdminGrantResponse>> =>
    apiWithMessage.delete<SchoolAdminGrantResponse>(
      `/schools/${schoolId}/admin-grants/${coordinatorId}`,
    ),
};
