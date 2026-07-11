import { useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentAdminGrantsQueryKey } from "~/features/department-admin-grants/api/use-department-admin-grants";
import { departmentAdminGrantsService } from "~/features/department-admin-grants/api/department-admin-grants.service";

export function useRevokeDepartmentAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      departmentId,
      coordinatorId,
    }: {
      departmentId: string;
      coordinatorId: string;
    }) => departmentAdminGrantsService.revokeDepartmentAdmin(departmentId, coordinatorId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: departmentAdminGrantsQueryKey(variables.departmentId),
      });
    },
  });
}
