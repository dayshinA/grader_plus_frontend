export interface AcademicModuleResponse {
  id: string;
  code: string;
  name: string;
  learnId: string | null;
  coordinatorId: string;
  departmentId: string;
  discrepancyThreshold: number;
  markingDeadline: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAcademicModuleRequest {
  code: string;
  name: string;
  learnId?: string | null;
  /** Ignored (overridden server-side) for a Coordinator caller — required for Super Admin. */
  coordinatorId?: string;
  departmentId: string;
  discrepancyThreshold: number;
  markingDeadline: string;
}

export interface UpdateAcademicModuleRequest {
  code?: string;
  name?: string;
  learnId?: string | null;
  /** Only takes effect if the caller is Super Admin — silently ignored otherwise. */
  coordinatorId?: string;
  /** Only takes effect if the caller is Super Admin — silently ignored otherwise. */
  departmentId?: string;
  discrepancyThreshold?: number;
  markingDeadline?: string;
  isActive?: boolean;
}
