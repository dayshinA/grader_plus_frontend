import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolAdminGrantsQueryKey } from "~/features/school-admin-grants/api/use-school-admin-grants";
import { schoolAdminGrantsService } from "~/features/school-admin-grants/api/school-admin-grants.service";

export function useRevokeSchoolAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      schoolId,
      coordinatorId,
    }: {
      schoolId: string;
      coordinatorId: string;
    }) => schoolAdminGrantsService.revokeSchoolAdmin(schoolId, coordinatorId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: schoolAdminGrantsQueryKey(variables.schoolId),
      });
    },
  });
}
