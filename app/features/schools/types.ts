export interface SchoolResponse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  /**
   * Only ever populated by `GET /schools` for a Coordinator caller — `true` if they administer
   * the school (`school_admin_grants`). Always `true` for a Super Admin caller's rows. Omitted
   * (`undefined`) from `create`/`findOne`/`update`/`remove` responses, where it isn't meaningful.
   */
  isAdmin?: boolean;
}

export interface CreateSchoolRequest {
  code: string;
  name: string;
}

export interface UpdateSchoolRequest {
  code?: string;
  name?: string;
  isActive?: boolean;
}
