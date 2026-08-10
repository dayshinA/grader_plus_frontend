import type { RubricResponse } from "~/features/rubrics/types";
import { api } from "~/lib/api-client";

/**
 * Raw `RubricsController` endpoint calls (`src/academic-modules/rubrics.controller.ts`).
 *
 * Read-only for now: `rubrics.view` is what Department Admin and System Administrator hold,
 * and it's the only key on this controller that isn't the module's own Coordinator's alone.
 * The create/update/delete calls belong with the Coordinator's authoring screen and aren't
 * built yet — add them here when that lands, don't start a second service file.
 */
export const rubricsService = {
  /**
   * `GET /academic-modules/:moduleId/rubric` — 404 `RUBRIC_NOT_FOUND` when the module has no
   * rubric yet, which is an ordinary state rather than a failure (see `isRubricMissing`).
   */
  getRubric: (moduleId: string): Promise<RubricResponse> =>
    api.get<RubricResponse>(`/academic-modules/${moduleId}/rubric`),
};
