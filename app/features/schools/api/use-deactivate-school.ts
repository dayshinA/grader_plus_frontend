import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsQueryKey } from "~/features/schools/api/use-schools";
import { schoolsService } from "~/features/schools/api/schools.service";

/** Calls the soft-delete `DELETE /schools/:id` endpoint. To reactivate, use `useUpdateSchool`
 * with `{ isActive: true }` instead — there's no separate reactivate endpoint. */
export function useDeactivateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schoolsService.deactivateSchool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolsQueryKey });
    },
  });
}
