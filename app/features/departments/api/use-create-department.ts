import { useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import type { CreateDepartmentRequest } from "~/features/departments/types";

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateDepartmentRequest) =>
      departmentsService.createDepartment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
    },
  });
}
