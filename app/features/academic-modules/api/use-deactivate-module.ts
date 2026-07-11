import { useMutation, useQueryClient } from "@tanstack/react-query";
import { academicModulesQueryKey } from "~/features/academic-modules/api/use-academic-modules";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";

/** Calls the soft-delete `DELETE /academic-modules/:id` endpoint. To reactivate, use
 * `useUpdateModule` with `{ isActive: true }` instead — there's no separate reactivate endpoint. */
export function useDeactivateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => academicModulesService.deactivateModule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academicModulesQueryKey });
    },
  });
}
