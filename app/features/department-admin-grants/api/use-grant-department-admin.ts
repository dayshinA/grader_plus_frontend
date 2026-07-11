import { useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentAdminGrantsQueryKey } from "~/features/department-admin-grants/api/use-department-admin-grants";
import { departmentAdminGrantsService } from "~/features/department-admin-grants/api/department-admin-grants.service";
import type { GrantDepartmentAdminRequest } from "~/features/department-admin-grants/types";

/** Used for both the initial "Assign Department Admin" grant and re-granting a previously
 * revoked coordinator — the backend's POST is idempotent-by-target, so both call sites share
 * this one mutation. */
export function useGrantDepartmentAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      departmentId,
      coordinatorId,
    }: { departmentId: string } & GrantDepartmentAdminRequest) =>
      departmentAdminGrantsService.grantDepartmentAdmin(departmentId, { coordinatorId }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: departmentAdminGrantsQueryKey(variables.departmentId),
      });
    },
  });
}
