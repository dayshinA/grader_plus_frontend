import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moduleCreationGrantsQueryKey } from "~/features/module-creation-grants/api/use-module-creation-grants";
import { moduleCreationGrantsService } from "~/features/module-creation-grants/api/module-creation-grants.service";
import type { GrantModuleCreationRequest } from "~/features/module-creation-grants/types";

/** Used for both the initial grant and re-granting a previously revoked coordinator — the
 * backend's POST is idempotent-by-target, so both call sites share this one mutation. */
export function useGrantModuleCreation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      departmentId,
      coordinatorId,
    }: { departmentId: string } & GrantModuleCreationRequest) =>
      moduleCreationGrantsService.grantModuleCreation(departmentId, { coordinatorId }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: moduleCreationGrantsQueryKey(variables.departmentId),
      });
    },
  });
}
