import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { markerDashboardQueryKey } from "~/features/dashboard/api/use-marker-dashboard";
import { evaluationsService } from "~/features/grading/api/evaluations.service";
import { markerRubricService } from "~/features/grading/api/marker-rubric.service";
import type {
  EvaluationResponse,
  UpdateEvaluationRequest,
  UpsertEvaluationScoreRequest,
} from "~/features/grading/types";
import { isApiError } from "~/lib/api-client";

export const evaluationQueryKey = (moduleId: string, studentId: string) =>
  ["evaluation", moduleId, studentId] as const;

export const markerRubricQueryKey = (moduleId: string, studentId: string) =>
  ["marker-rubric", moduleId, studentId] as const;

/**
 * The rubric the marker is scoring against.
 *
 * A rubric can't change once marking has started (the backend blocks deleting a criterion any
 * evaluation references), so this one *does* take a `staleTime` — unlike the evaluation beside it,
 * which changes constantly.
 */
export function useMarkerRubric(moduleId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: markerRubricQueryKey(moduleId ?? "", studentId ?? ""),
    queryFn: () => markerRubricService.getForStudent(moduleId as string, studentId as string),
    enabled: Boolean(moduleId && studentId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The caller's own evaluation, or `null` when they haven't started one.
 *
 * "Not started" is a **404 `EVALUATION_NOT_FOUND`**, which is an expected state rather than a
 * failure — every marker sees it once per student — so it's mapped to `null` here instead of
 * being thrown. Every other 404 on this route means the blind-isolation boundary
 * (`STUDENT_NOT_FOUND`) and is deliberately left to throw, because the screen must render that as
 * "this isn't yours", not as an empty form inviting a marker to start scoring someone they aren't
 * assigned to.
 */
export function useEvaluation(moduleId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: evaluationQueryKey(moduleId ?? "", studentId ?? ""),
    queryFn: async (): Promise<EvaluationResponse | null> => {
      try {
        return await evaluationsService.getOwn(moduleId as string, studentId as string);
      } catch (error) {
        if (isApiError(error) && error.code === "EVALUATION_NOT_FOUND") return null;
        throw error;
      }
    },
    enabled: Boolean(moduleId && studentId),
  });
}

/** Starts the evaluation. Also refreshes My Projects, where the row moves off "Not started". */
export function useStartEvaluation(moduleId: string, studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => evaluationsService.start(moduleId, studentId),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(evaluationQueryKey(moduleId, studentId), data);
      queryClient.invalidateQueries({ queryKey: markerDashboardQueryKey });
    },
  });
}

/**
 * General feedback and the draft → final transition.
 *
 * Only invalidates My Projects when `status` was part of the change — a feedback autosave doesn't
 * move the row, and refetching a cross-module list on every blur would be wasteful.
 */
export function useUpdateEvaluation(moduleId: string, studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateEvaluationRequest) =>
      evaluationsService.update(moduleId, studentId, body),
    onSuccess: ({ data }, variables) => {
      queryClient.setQueryData(evaluationQueryKey(moduleId, studentId), data);
      if (variables.status !== undefined) {
        queryClient.invalidateQueries({ queryKey: markerDashboardQueryKey });
      }
    },
  });
}

/**
 * Saves one criterion's score.
 *
 * The response is the whole evaluation with its server-recalculated `totalScore`, so it's written
 * straight into the cache — no refetch, and no attempt to recompute the weighted total on this
 * side, where a rounding difference would show a number the backend disagrees with.
 *
 * Each criterion card owns its own instance of this mutation, so two criteria saving at once
 * don't share a pending flag. They can still race on the shared cache entry; the loser is only
 * ever stale by one score, and the next save (or a remount) corrects it — worth accepting to keep
 * autosave per-field rather than serialising the whole form behind one queue.
 */
export function useSaveScore(moduleId: string, studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      criterionId,
      ...body
    }: UpsertEvaluationScoreRequest & { criterionId: string }) =>
      evaluationsService.saveScore(moduleId, studentId, criterionId, body),
    onSuccess: (evaluation) => {
      queryClient.setQueryData(evaluationQueryKey(moduleId, studentId), evaluation);
    },
  });
}
