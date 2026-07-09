import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersQueryKey } from "~/features/users/api/use-users";
import { usersService } from "~/features/users/api/users.service";
import type { CreateUserRequest } from "~/features/users/types";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateUserRequest) => usersService.createUser(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}
