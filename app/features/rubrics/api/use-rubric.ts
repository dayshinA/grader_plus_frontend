import { useQuery } from "@tanstack/react-query";

import { rubricsService } from "~/features/rubrics/api/rubrics.service";
import { isApiError } from "~/lib/api-client";

export const rubricQueryKey = (moduleId: string) => ["rubric", moduleId] as const;

/**
 * A module with no rubric yet 404s rather than returning null, so "not built yet" arrives as
 * a query error. It isn't one — it's the state every module starts in, and the screen shows an
 * empty state for it. Same shape as `is403` (decision #44), narrowed to this one code.
 */
export function isRubricMissing(error: unknown): boolean {
  return isApiError(error) && error.code === "RUBRIC_NOT_FOUND";
}

/** `enabled` until a module is picked — `useModuleSelection` defaults to the first accessible
 * one, so this is only `undefined` on the very first render. */
export function useRubric(moduleId: string | undefined) {
  return useQuery({
    queryKey: rubricQueryKey(moduleId ?? ""),
    queryFn: () => rubricsService.getRubric(moduleId as string),
    enabled: Boolean(moduleId),
  });
}
