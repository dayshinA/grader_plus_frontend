import { useMutation, useQueryClient } from "@tanstack/react-query";

import { rubricsService } from "~/features/rubrics/api/rubrics.service";
import { rubricQueryKey } from "~/features/rubrics/api/use-rubric";
import type {
  CreateRubricCriterionRequest,
  CreateRubricRequest,
  UpdateRubricCriterionRequest,
  UpdateRubricRequest,
} from "~/features/rubrics/types";
import { isApiError } from "~/lib/api-client";

/**
 * The six rubric writes, all `rubrics.create`/`update`/`delete` — the module Coordinator's alone.
 *
 * Every one of them invalidates the same single query: the whole rubric comes back from
 * `GET .../rubric` in one response (criteria included, already ordered), so there's nothing
 * finer-grained to invalidate and no benefit in trying. Deleting the rubric invalidates it too
 * rather than clearing the cache, so the screen re-fetches and lands on its real "no rubric yet"
 * 404 state instead of a locally-guessed one.
 */
function useRubricInvalidation(moduleId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: rubricQueryKey(moduleId) });
}

export function useCreateRubric(moduleId: string) {
  const invalidate = useRubricInvalidation(moduleId);
  return useMutation({
    mutationFn: (request: CreateRubricRequest) =>
      rubricsService.createRubric(moduleId, request),
    onSuccess: invalidate,
  });
}

export function useUpdateRubric(moduleId: string) {
  const invalidate = useRubricInvalidation(moduleId);
  return useMutation({
    mutationFn: (request: UpdateRubricRequest) =>
      rubricsService.updateRubric(moduleId, request),
    onSuccess: invalidate,
  });
}

export function useDeleteRubric(moduleId: string) {
  const invalidate = useRubricInvalidation(moduleId);
  return useMutation({
    mutationFn: () => rubricsService.deleteRubric(moduleId),
    onSuccess: invalidate,
  });
}

export function useCreateCriterion(moduleId: string) {
  const invalidate = useRubricInvalidation(moduleId);
  return useMutation({
    mutationFn: (request: CreateRubricCriterionRequest) =>
      rubricsService.createCriterion(moduleId, request),
    onSuccess: invalidate,
  });
}

export function useUpdateCriterion(moduleId: string) {
  const invalidate = useRubricInvalidation(moduleId);
  return useMutation({
    mutationFn: ({
      criterionId,
      request,
    }: {
      criterionId: string;
      request: UpdateRubricCriterionRequest;
    }) => rubricsService.updateCriterion(moduleId, criterionId, request),
    onSuccess: invalidate,
  });
}

export function useDeleteCriterion(moduleId: string) {
  const invalidate = useRubricInvalidation(moduleId);
  return useMutation({
    mutationFn: (criterionId: string) =>
      rubricsService.deleteCriterion(moduleId, criterionId),
    onSuccess: invalidate,
  });
}

/**
 * The two "you can't delete this any more" codes, turned into copy that says *why*.
 *
 * Both are 422s the backend raises once marking has started, and both are ordinary outcomes rather
 * than faults — a coordinator who opened marking last week and now wants to reword a criterion is
 * doing something reasonable, and "Unprocessable Entity" tells them nothing. Returns null for
 * anything else so the caller falls back to the error's own message.
 */
export function rubricDeleteBlockedMessage(error: unknown): string | null {
  if (!isApiError(error)) return null;
  if (error.code === "RUBRIC_IN_USE") {
    return "Markers have already started evaluations against this rubric, so it can't be deleted. Editing the criteria is still possible.";
  }
  if (error.code === "RUBRIC_CRITERION_IN_USE") {
    return "At least one marker has already scored this criterion, so it can't be deleted. You can still edit its wording, weighting or maximum score.";
  }
  return null;
}
