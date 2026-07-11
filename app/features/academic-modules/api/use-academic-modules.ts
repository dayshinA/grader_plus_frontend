import { useQuery } from "@tanstack/react-query";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";

export const academicModulesQueryKey = ["academic-modules"] as const;

export function useAcademicModules() {
  return useQuery({
    queryKey: academicModulesQueryKey,
    queryFn: academicModulesService.getModules,
  });
}
