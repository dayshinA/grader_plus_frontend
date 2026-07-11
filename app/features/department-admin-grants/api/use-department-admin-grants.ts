import { useQuery } from "@tanstack/react-query";
import { departmentAdminGrantsService } from "~/features/department-admin-grants/api/department-admin-grants.service";

export const departmentAdminGrantsQueryKey = (departmentId: string) =>
  ["department-admin-grants", departmentId] as const;

/** `enabled` is gated on a department actually being selected — unlike every other list query
 * in this repo, this one is genuinely selection-dependent (no department is chosen on first
 * load), so there's nothing to fetch until `departmentId` is set. */
export function useDepartmentAdminGrants(departmentId: string | undefined) {
  return useQuery({
    queryKey: departmentAdminGrantsQueryKey(departmentId ?? ""),
    queryFn: () => departmentAdminGrantsService.getGrants(departmentId as string),
    enabled: Boolean(departmentId),
  });
}
