import { useQuery } from "@tanstack/react-query";
import { usersService } from "~/features/users/api/users.service";

export const usersQueryKey = ["users"] as const;

/** `enabled` defaults to true — pass `false` for a caller that can't call `GET /users`
 * (Super-Admin-only) at all, e.g. a Coordinator-viewed screen that only needs this hook's shape
 * conditionally. First non-default consumer: `ModulesPage`'s Coordinator viewer. */
export function useUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: usersService.getUsers,
    enabled: options?.enabled ?? true,
  });
}
