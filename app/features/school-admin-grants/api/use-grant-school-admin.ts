import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolAdminGrantsQueryKey } from "~/features/school-admin-grants/api/use-school-admin-grants";
import { schoolAdminGrantsService } from "~/features/school-admin-grants/api/school-admin-grants.service";
import type { GrantSchoolAdminRequest } from "~/features/school-admin-grants/types";

/** Used for both the initial "Assign School Admin" grant and re-granting a previously revoked
 * coordinator — the backend's POST is idempotent-by-target, so both call sites share this one
 * mutation. */
export function useGrantSchoolAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, coordinatorId }: { schoolId: string } & GrantSchoolAdminRequest) =>
      schoolAdminGrantsService.grantSchoolAdmin(schoolId, { coordinatorId }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: schoolAdminGrantsQueryKey(variables.schoolId),
      });
    },
  });
}
