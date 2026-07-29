export interface SchoolAdminGrantResponse {
  schoolId: string;
  coordinatorId: string;
  isActive: boolean;
  grantedBy: string | null;
  grantedAt: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
}

export interface GrantSchoolAdminRequest {
  coordinatorId: string;
}
