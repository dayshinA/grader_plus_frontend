import type {
  CreateRubricCriterionRequest,
  CreateRubricRequest,
  RubricCriterionResponse,
  RubricResponse,
  UpdateRubricCriterionRequest,
  UpdateRubricRequest,
} from "~/features/rubrics/types";
import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";

/**
 * Raw `RubricsController` endpoint calls (`src/academic-modules/rubrics.controller.ts`).
 *
 * The read is `rubrics.view` (the module's Coordinator, its Department Admin, or System
 * Administrator — School Admin holds nothing here by design). Every write below is
 * `rubrics.create`/`update`/`delete`, which since the backend's 2026-08-03 least-privilege
 * redesign belong to the module's own **Coordinator alone** — no admin tier holds them at any
 * scope. The screen gates each control accordingly; these functions don't check anything.
 *
 * Mutations use `apiWithMessage` so a toast can quote the backend's own confirmation rather than a
 * hand-written string (decision #31).
 */
export const rubricsService = {
  /**
   * `GET /academic-modules/:moduleId/rubric` — 404 `RUBRIC_NOT_FOUND` when the module has no
   * rubric yet, which is an ordinary state rather than a failure (see `isRubricMissing`).
   */
  getRubric: (moduleId: string): Promise<RubricResponse> =>
    api.get<RubricResponse>(`/academic-modules/${moduleId}/rubric`),

  /** `POST .../rubric` — one rubric per module; a second attempt returns 409. */
  createRubric: (
    moduleId: string,
    request: CreateRubricRequest,
  ): Promise<ApiResult<RubricResponse>> =>
    apiWithMessage.post<RubricResponse>(`/academic-modules/${moduleId}/rubric`, request),

  /** `PATCH .../rubric` — the shell's title only. Criteria go through the calls below. */
  updateRubric: (
    moduleId: string,
    request: UpdateRubricRequest,
  ): Promise<ApiResult<RubricResponse>> =>
    apiWithMessage.patch<RubricResponse>(`/academic-modules/${moduleId}/rubric`, request),

  /**
   * `DELETE .../rubric` — criteria cascade. **422 `RUBRIC_IN_USE`** once any evaluation exists
   * against it, including an empty draft, which is the common case once marking has opened.
   */
  deleteRubric: (moduleId: string): Promise<ApiResult<unknown>> =>
    apiWithMessage.delete<unknown>(`/academic-modules/${moduleId}/rubric`),

  /** `POST .../rubric/criteria` — `displayOrder` is omitted so the backend appends (MAX + 1). */
  createCriterion: (
    moduleId: string,
    request: CreateRubricCriterionRequest,
  ): Promise<ApiResult<RubricCriterionResponse>> =>
    apiWithMessage.post<RubricCriterionResponse>(
      `/academic-modules/${moduleId}/rubric/criteria`,
      request,
    ),

  /** `PATCH .../rubric/criteria/:criterionId` — a criterion reached through the wrong module's
   * path returns 404, never 403. */
  updateCriterion: (
    moduleId: string,
    criterionId: string,
    request: UpdateRubricCriterionRequest,
  ): Promise<ApiResult<RubricCriterionResponse>> =>
    apiWithMessage.patch<RubricCriterionResponse>(
      `/academic-modules/${moduleId}/rubric/criteria/${criterionId}`,
      request,
    ),

  /** `DELETE .../rubric/criteria/:criterionId` — **422 `RUBRIC_CRITERION_IN_USE`** once any
   * marker has scored it, draft or final. */
  deleteCriterion: (moduleId: string, criterionId: string): Promise<ApiResult<unknown>> =>
    apiWithMessage.delete<unknown>(
      `/academic-modules/${moduleId}/rubric/criteria/${criterionId}`,
    ),
};
