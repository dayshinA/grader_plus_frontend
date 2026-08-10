import { useMutation, useQuery } from "@tanstack/react-query";

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

/**
 * Downloads the Learn-format CSV.
 *
 * A mutation rather than a query, despite being a GET: it's an action taken on a button press
 * whose result is a file handed straight to the browser, not state any component renders. Caching
 * it would be actively wrong — an export is a point-in-time snapshot and a second click should
 * fetch again.
 */
export function useExportGradesCsv(moduleId: string) {
  return useMutation({
    mutationFn: (options?: { studentIds?: string[]; includeFeedback?: boolean }) =>
      exportService.exportGradesCsv(moduleId, options),
  });
}
