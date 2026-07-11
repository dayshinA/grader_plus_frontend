import { useMutation, useQueryClient } from "@tanstack/react-query";
import { academicModulesQueryKey } from "~/features/academic-modules/api/use-academic-modules";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";
import type { UpdateAcademicModuleRequest } from "~/features/academic-modules/types";

/** Also used for reactivation (`{ isActive: true }`) — there's no separate reactivate endpoint. */
export function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateAcademicModuleRequest }) =>
      academicModulesService.updateModule(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academicModulesQueryKey });
    },
  });
}
