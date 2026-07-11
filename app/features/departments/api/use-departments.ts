import { useQuery } from "@tanstack/react-query";
import { departmentsService } from "~/features/departments/api/departments.service";

export const departmentsQueryKey = ["departments"] as const;

export function useDepartments() {
  return useQuery({
    queryKey: departmentsQueryKey,
    queryFn: departmentsService.getDepartments,
  });
}
