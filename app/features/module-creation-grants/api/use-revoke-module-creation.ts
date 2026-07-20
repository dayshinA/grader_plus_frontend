import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moduleCreationGrantsQueryKey } from "~/features/module-creation-grants/api/use-module-creation-grants";
import { moduleCreationGrantsService } from "~/features/module-creation-grants/api/module-creation-grants.service";

export function useRevokeModuleCreation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      departmentId,
      coordinatorId,
    }: {
      departmentId: string;
      coordinatorId: string;
    }) => moduleCreationGrantsService.revokeModuleCreation(departmentId, coordinatorId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: moduleCreationGrantsQueryKey(variables.departmentId),
      });
    },
  });
}
