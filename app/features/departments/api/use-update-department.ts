import { useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";
import type { UpdateDepartmentRequest } from "~/features/departments/types";

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateDepartmentRequest }) =>
      departmentsService.updateDepartment(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
    },
  });
}
