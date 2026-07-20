import { useQuery } from "@tanstack/react-query";
import { moduleCreationGrantsService } from "~/features/module-creation-grants/api/module-creation-grants.service";

export const moduleCreationGrantsQueryKey = (departmentId: string) =>
  ["module-creation-grants", departmentId] as const;

/** `enabled` is gated on a department actually being selected — same convention as
 * `useDepartmentAdminGrants`, since no department is chosen on first load. */
export function useModuleCreationGrants(departmentId: string | undefined) {
  return useQuery({
    queryKey: moduleCreationGrantsQueryKey(departmentId ?? ""),
    queryFn: () => moduleCreationGrantsService.getGrants(departmentId as string),
    enabled: Boolean(departmentId),
  });
}
