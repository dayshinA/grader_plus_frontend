import { useMutation, useQueryClient } from "@tanstack/react-query";
import { academicModulesQueryKey } from "~/features/academic-modules/api/use-academic-modules";
import { academicModulesService } from "~/features/academic-modules/api/academic-modules.service";
import type { CreateAcademicModuleRequest } from "~/features/academic-modules/types";

export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateAcademicModuleRequest) =>
      academicModulesService.createModule(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academicModulesQueryKey });
    },
  });
}
