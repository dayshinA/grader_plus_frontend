import { useQuery } from "@tanstack/react-query";
import { departmentsService } from "~/features/departments/api/departments.service";

export const departmentsQueryKey = ["departments"] as const;

/** `enabled` defaults to true — pass `false` for a caller that can't call `GET /departments`
 * (Super-Admin-only) at all, e.g. a Coordinator-viewed screen that only needs this hook's shape
 * conditionally. First non-default consumer: `ModulesPage`'s Coordinator viewer. */
export function useDepartments(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: departmentsQueryKey,
    queryFn: departmentsService.getDepartments,
    enabled: options?.enabled ?? true,
  });
}
