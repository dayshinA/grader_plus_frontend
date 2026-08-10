import { useQuery } from "@tanstack/react-query";
import { schoolsService } from "~/features/schools/api/schools.service";

export const schoolCoordinatorsQueryKey = (schoolId: string) =>
  ["school-coordinators", schoolId] as const;

/** `enabled` is gated on a school actually being selected — same convention as
 * `useDepartmentCoordinators`. First consumer: the "Delegate Department Admin" tab on
 * `workspace/school-settings.tsx`. */
export function useSchoolCoordinators(schoolId: string | undefined) {
  return useQuery({
    queryKey: schoolCoordinatorsQueryKey(schoolId ?? ""),
    queryFn: () => schoolsService.getCoordinators(schoolId as string),
    enabled: Boolean(schoolId),
  });
}
