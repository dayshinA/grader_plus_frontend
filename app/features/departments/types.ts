export interface DepartmentResponse {
  id: string;
  code: string;
  name: string;
  /** Required as of 2026-07-29 (FR41) — every department belongs to exactly one school. */
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  /**
   * Only ever populated by `GET /departments` (2026-07-11 backend fix) for a Coordinator caller
   * — `true` if they administer the department, either directly (`department_admin_grants`) or
   * via cascaded School Admin oversight on this department's school (2026-07-29 — the two are no
   * longer distinguishable from this field alone), `false` if they only hold a module-creation
   * grant there. Always `true` for a Super Admin caller's rows. Omitted (`undefined`) from
   * `create`/`findOne`/`update`/`remove` responses, where it isn't meaningful.
   */
  isAdmin?: boolean;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
  /** Required as of 2026-07-29 (FR41/43). */
  schoolId: string;
}

export interface UpdateDepartmentRequest {
  code?: string;
  name?: string;
  isActive?: boolean;
  schoolId?: string;
}

/** `GET /departments/:departmentId/coordinators` (added 2026-07-20, FR40 delegation-picker fix)
 * — every active coordinator system-wide, not scoped to `:departmentId` beyond the
 * `DepartmentAdminGuard` authorization check (coordinators have no "home" department in the
 * data model). Lighter-weight than `UserResponse` since this route is Coordinator-callable, not
 * Super-Admin-only like `GET /users`. */
export interface CoordinatorResponse {
  id: string;
  fullName: string;
  email: string;
}
