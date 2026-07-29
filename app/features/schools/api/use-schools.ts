import { useQuery } from "@tanstack/react-query";
import { schoolsService } from "~/features/schools/api/schools.service";

export const schoolsQueryKey = ["schools"] as const;

/** `enabled` defaults to true — pass `false` for a caller that can't call `GET /schools` at all
 * yet (mirrors `useDepartments`'s option, decision #37). */
export function useSchools(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: schoolsQueryKey,
    queryFn: schoolsService.getSchools,
    enabled: options?.enabled ?? true,
  });
}
