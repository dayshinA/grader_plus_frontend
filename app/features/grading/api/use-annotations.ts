import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { annotationsService } from "~/features/grading/api/annotations.service";
import type {
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
} from "~/features/grading/types";

export const annotationsQueryKey = (
  moduleId: string,
  studentId: string,
  submissionId: string,
) => ["annotations", moduleId, studentId, submissionId] as const;

/** The caller's own pins on one file. Never another marker's — see the service file. */
export function useAnnotations(
  moduleId: string | undefined,
  studentId: string | undefined,
  submissionId: string | undefined,
) {
  return useQuery({
    queryKey: annotationsQueryKey(moduleId ?? "", studentId ?? "", submissionId ?? ""),
    queryFn: () =>
      annotationsService.list(
        moduleId as string,
        studentId as string,
        submissionId as string,
      ),
    enabled: Boolean(moduleId && studentId && submissionId),
  });
}

/**
 * Create, edit and delete, sharing one invalidation.
 *
 * Returned as a group rather than three hooks because every consumer (the pin overlay, the
 * annotation list, the popover) needs all three, and splitting them would mean three
 * near-identical files whose only difference is the verb.
 */
export function useAnnotationMutations(
  moduleId: string,
  studentId: string,
  submissionId: string,
) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: annotationsQueryKey(moduleId, studentId, submissionId),
    });

  const create = useMutation({
    mutationFn: (body: CreateAnnotationRequest) =>
      annotationsService.create(moduleId, studentId, submissionId, body),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      annotationId,
      ...body
    }: UpdateAnnotationRequest & { annotationId: string }) =>
      annotationsService.update(moduleId, studentId, submissionId, annotationId, body),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (annotationId: string) =>
      annotationsService.remove(moduleId, studentId, submissionId, annotationId),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
