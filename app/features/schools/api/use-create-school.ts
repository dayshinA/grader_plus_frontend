import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsQueryKey } from "~/features/schools/api/use-schools";
import { schoolsService } from "~/features/schools/api/schools.service";
import type { CreateSchoolRequest } from "~/features/schools/types";

export function useCreateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateSchoolRequest) => schoolsService.createSchool(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolsQueryKey });
    },
  });
}
