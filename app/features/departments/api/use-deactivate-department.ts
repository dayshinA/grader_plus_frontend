import { useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentsQueryKey } from "~/features/departments/api/use-departments";
import { departmentsService } from "~/features/departments/api/departments.service";

/** Calls the soft-delete `DELETE /departments/:id` endpoint. To reactivate, use
 * `useUpdateDepartment` with `{ isActive: true }` instead — there's no separate reactivate endpoint. */
export function useDeactivateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => departmentsService.deactivateDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
    },
  });
}
