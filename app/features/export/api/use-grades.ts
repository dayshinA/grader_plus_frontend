import { useQuery } from "@tanstack/react-query";

import { exportService } from "~/features/export/api/export.service";

export const gradesQueryKey = (moduleId: string) => ["grades", moduleId] as const;

/** `enabled` until a module is picked — see `useModuleSelection`. */
export function useGrades(moduleId: string | undefined) {
  return useQuery({
    queryKey: gradesQueryKey(moduleId ?? ""),
    queryFn: () => exportService.getGrades(moduleId as string),
    enabled: Boolean(moduleId),
  });
}
