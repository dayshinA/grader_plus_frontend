import type {
  CreateEvaluationRequest,
  EvaluationResponse,
  UpdateEvaluationRequest,
  UpsertEvaluationScoreRequest,
} from "~/features/grading/types";
import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";

const base = (moduleId: string, studentId: string) =>
  `/academic-modules/${moduleId}/students/${studentId}/evaluations`;

/**
 * `src/grading/evaluations.controller.ts` — the marker's own evaluation of one student.
 *
 * Every route here is `evaluations.submit` (or `evaluations.view` on the read) **plus**
 * `BlindIsolationGuard`, and every one resolves the marker from the caller's token. There is no
 * marker argument in this file for that reason, and there should never be one.
 */
export const evaluationsService = {
  /**
   * `POST .../evaluations` — starts the evaluation. This is the only way one comes into existence;
   * the read below 404s until it has been called.
   *
   * Two 422s are the **coordinator's** problem rather than the marker's, and the screen has to say
   * so rather than showing a code: `RUBRIC_WEIGHTINGS_INVALID` (the module's criteria don't sum to
   * 100, checked here rather than at rubric-authoring time so a coordinator can build one in
   * peace) and a 404 `RUBRIC_NOT_FOUND` (no rubric at all yet). A second call for the same student
   * is a 409 `EVALUATION_ALREADY_EXISTS`.
   */
  start: (
    moduleId: string,
    studentId: string,
    body: CreateEvaluationRequest = {},
  ): Promise<ApiResult<EvaluationResponse>> =>
    apiWithMessage.post<EvaluationResponse>(base(moduleId, studentId), body),

  /** `GET .../evaluations/me` — 404 `EVALUATION_NOT_FOUND` until `start` has been called. */
  getOwn: (moduleId: string, studentId: string): Promise<EvaluationResponse> =>
    api.get<EvaluationResponse>(`${base(moduleId, studentId)}/me`),

  /**
   * `PATCH .../evaluations/me` — general feedback, the draft → final transition, or both.
   *
   * Going final while any criterion is unscored is a 422 `EVALUATION_INCOMPLETE` whose `errors[]`
   * is `{ field: <criterionId>, message }` per missing criterion — mappable straight onto the
   * criterion cards, which is why the screen doesn't pre-validate completeness itself.
   */
  update: (
    moduleId: string,
    studentId: string,
    body: UpdateEvaluationRequest,
  ): Promise<ApiResult<EvaluationResponse>> =>
    apiWithMessage.patch<EvaluationResponse>(`${base(moduleId, studentId)}/me`, body),

  /**
   * `PUT .../evaluations/me/scores/:criterionId` — upsert one criterion's score.
   *
   * Returns the **whole** evaluation with its recalculated `totalScore`, which is why the caller
   * writes the response straight back into the cache instead of refetching. Plain `api` rather
   * than `apiWithMessage`: this is an autosave, and a toast per keystroke-pause would be noise.
   */
  saveScore: (
    moduleId: string,
    studentId: string,
    criterionId: string,
    body: UpsertEvaluationScoreRequest,
  ): Promise<EvaluationResponse> =>
    api.put<EvaluationResponse>(
      `${base(moduleId, studentId)}/me/scores/${criterionId}`,
      body,
    ),
};
