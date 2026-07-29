import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsQueryKey } from "~/features/schools/api/use-schools";
import { schoolsService } from "~/features/schools/api/schools.service";
import type { UpdateSchoolRequest } from "~/features/schools/types";

export function useUpdateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateSchoolRequest }) =>
      schoolsService.updateSchool(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolsQueryKey });
    },
  });
}
