import type {
  AnnotationResponse,
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
} from "~/features/grading/types";
import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";

const base = (moduleId: string, studentId: string, submissionId: string) =>
  `/academic-modules/${moduleId}/students/${studentId}/submissions/${submissionId}/annotations`;

/**
 * `src/grading/annotations.controller.ts` — the marker's own pins on one submission file.
 *
 * The list route returns **only** the caller's annotations: another marker's pins on the same file
 * aren't hidden, they're never fetched, and their existence is never revealed. Ownership failures
 * on update/delete come back as 404 `ANNOTATION_NOT_FOUND`, identical to a pin that doesn't exist.
 */
export const annotationsService = {
  /** `GET .../annotations` — yours only, oldest first. */
  list: (
    moduleId: string,
    studentId: string,
    submissionId: string,
  ): Promise<AnnotationResponse[]> =>
    api.get<AnnotationResponse[]>(base(moduleId, studentId, submissionId)),

  /**
   * `POST .../annotations`. PDF and Word only — anything else is a 422
   * `UNSUPPORTED_ANNOTATION_FILE_TYPE`.
   *
   * `posX`/`posY` are page fractions 0–1, not pixels, so the caller converts a click before
   * getting here and never persists a coordinate that depends on the window it was made in.
   */
  create: (
    moduleId: string,
    studentId: string,
    submissionId: string,
    body: CreateAnnotationRequest,
  ): Promise<ApiResult<AnnotationResponse>> =>
    apiWithMessage.post<AnnotationResponse>(
      base(moduleId, studentId, submissionId),
      body,
    ),

  /** `PATCH .../annotations/:annotationId` — content and highlight text only; position is immutable. */
  update: (
    moduleId: string,
    studentId: string,
    submissionId: string,
    annotationId: string,
    body: UpdateAnnotationRequest,
  ): Promise<ApiResult<AnnotationResponse>> =>
    apiWithMessage.patch<AnnotationResponse>(
      `${base(moduleId, studentId, submissionId)}/${annotationId}`,
      body,
    ),

  /** `DELETE .../annotations/:annotationId`. */
  remove: (
    moduleId: string,
    studentId: string,
    submissionId: string,
    annotationId: string,
  ): Promise<ApiResult<void>> =>
    apiWithMessage.delete<void>(
      `${base(moduleId, studentId, submissionId)}/${annotationId}`,
    ),
};
