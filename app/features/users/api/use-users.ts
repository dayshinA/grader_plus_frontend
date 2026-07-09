import { useQuery } from "@tanstack/react-query";
import { usersService } from "~/features/users/api/users.service";

export const usersQueryKey = ["users"] as const;

export function useUsers() {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: usersService.getUsers,
  });
}
