import { useQuery } from "@tanstack/react-query";
import { schoolAdminGrantsService } from "~/features/school-admin-grants/api/school-admin-grants.service";

export const schoolAdminGrantsQueryKey = (schoolId: string) =>
  ["school-admin-grants", schoolId] as const;

/** `enabled` is gated on a school actually being selected — same convention as
 * `useDepartmentAdminGrants` (genuinely selection-dependent, nothing to fetch until a school is
 * picked). */
export function useSchoolAdminGrants(schoolId: string | undefined) {
  return useQuery({
    queryKey: schoolAdminGrantsQueryKey(schoolId ?? ""),
    queryFn: () => schoolAdminGrantsService.getGrants(schoolId as string),
    enabled: Boolean(schoolId),
  });
}
