import { useQuery } from "@tanstack/react-query";
import { departmentsService } from "~/features/departments/api/departments.service";

export const departmentCoordinatorsQueryKey = (departmentId: string) =>
  ["department-coordinators", departmentId] as const;

/** `enabled` is gated on a department actually being selected — same convention as
 * `useModuleCreationGrants`/`useDepartmentAdminGrants`. First consumer: the Coordinator/
 * Department-Admin delegation tab on `workspace/module-settings.tsx`, where the caller may
 * administer more than one department and picks which one to delegate in. */
export function useDepartmentCoordinators(departmentId: string | undefined) {
  return useQuery({
    queryKey: departmentCoordinatorsQueryKey(departmentId ?? ""),
    queryFn: () => departmentsService.getCoordinators(departmentId as string),
    enabled: Boolean(departmentId),
  });
}
