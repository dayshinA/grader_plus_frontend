import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type {
  Annotation,
  CreateAnnotationPayload,
  EvaluationRow,
  MarkingQueueItem,
  MarkingWorkspace,
  PutFeedbackPayload,
  PutScoresPayload,
  UpdateAnnotationPayload,
} from "~/features/marking/types";

// No call here carries a marker identity. Sending one is a 422 rather than being ignored.
export const markingService = {
  /** What the caller still owes. Their own state, never a count of anybody else's. */
  queue(): Promise<MarkingQueueItem[]> {
    return api.get<MarkingQueueItem[]>("/me/marking-queue");
  },

  /** The project, the rubric, the files, and the caller's own evaluation. Nothing else. */
  workspace(projectId: string): Promise<MarkingWorkspace> {
    return api.get<MarkingWorkspace>(`/marking/projects/${projectId}`);
  },

  // The total is recomputed server side, so the figure on screen comes from this response.
  saveScores(projectId: string, payload: PutScoresPayload): Promise<EvaluationRow> {
    return api.put<EvaluationRow>(`/marking/projects/${projectId}/scores`, payload);
  },

  saveFeedback(projectId: string, payload: PutFeedbackPayload): Promise<EvaluationRow> {
    return api.put<EvaluationRow>(`/marking/projects/${projectId}/feedback`, payload);
  },

  // Deliberate, and refused while any criterion is unscored. A later edit re-runs comparison silently.
  submit(projectId: string): Promise<ApiResult<EvaluationRow>> {
    return apiWithMessage.post<EvaluationRow>(`/marking/projects/${projectId}/submit`);
  },

  /** The caller's own pins only. Another marker's are absent, not filtered. */
  annotations(submissionId: string): Promise<Annotation[]> {
    return api.get<Annotation[]>(`/marking/submissions/${submissionId}/annotations`);
  },

  createAnnotation(
    submissionId: string,
    payload: CreateAnnotationPayload,
  ): Promise<Annotation> {
    return api.post<Annotation>(`/marking/submissions/${submissionId}/annotations`, payload);
  },

  updateAnnotation(
    annotationId: string,
    payload: UpdateAnnotationPayload,
  ): Promise<Annotation> {
    return api.patch<Annotation>(`/annotations/${annotationId}`, payload);
  },

  deleteAnnotation(annotationId: string): Promise<Annotation> {
    return api.delete<Annotation>(`/annotations/${annotationId}`);
  },
};
