import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";

/** Calls the soft-delete `DELETE /users/:id` endpoint. To reactivate, use `useUpdateUser` with `{ isActive: true }` instead — there's no separate reactivate endpoint. */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}
