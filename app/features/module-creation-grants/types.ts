export interface ModuleCreationGrantResponse {
  coordinatorId: string;
  departmentId: string;
  isActive: boolean;
  grantedBy: string | null;
  grantedAt: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
}

export interface GrantModuleCreationRequest {
  coordinatorId: string;
}
