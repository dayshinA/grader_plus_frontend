export interface DepartmentResponse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  /**
   * Only ever populated by `GET /departments` (2026-07-11 backend fix) for a Coordinator caller
   * — `true` if they administer the department (`department_admin_grants`), `false` if they only
   * hold a module-creation grant there. Always `true` for a Super Admin caller's rows. Omitted
   * (`undefined`) from `create`/`findOne`/`update`/`remove` responses, where it isn't meaningful.
   */
  isAdmin?: boolean;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
}

export interface UpdateDepartmentRequest {
  code?: string;
  name?: string;
  isActive?: boolean;
}
