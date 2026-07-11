export interface DepartmentAdminGrantResponse {
  departmentId: string;
  coordinatorId: string;
  isActive: boolean;
  grantedBy: string | null;
  grantedAt: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
}

export interface GrantDepartmentAdminRequest {
  coordinatorId: string;
}
