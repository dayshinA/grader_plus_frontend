export interface DepartmentResponse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
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
