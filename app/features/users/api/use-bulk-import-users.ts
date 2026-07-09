import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";

export function useBulkImportUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => usersService.bulkImportUsers(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}
