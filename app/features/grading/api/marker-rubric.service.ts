import type { RubricResponse } from "~/features/rubrics/types";
import { api } from "~/lib/api-client";

/**
 * `GET /academic-modules/:moduleId/students/:studentId/rubric` — the **only** rubric read a Marker
 * can perform (backend route added 2026-08-10).
 *
 * `rubricsService.getRubric` hits `GET .../rubric`, which is gated on `rubrics.view` at the
 * module; the Marker template holds no `rubrics.*` key at any scope, so that call 403s every
 * marker. This one is gated on `evaluations.view` plus `BlindIsolationGuard` instead, tying the
 * read to the marker's own assignment rather than to a scope that would also cover modules they
 * aren't marking on.
 *
 * The payload is byte-identical to the coordinator's, so it reuses `RubricResponse` rather than
 * declaring a parallel type — if the rubric shape changes, both surfaces change together.
 */
export const markerRubricService = {
  getForStudent: (moduleId: string, studentId: string): Promise<RubricResponse> =>
    api.get<RubricResponse>(
      `/academic-modules/${moduleId}/students/${studentId}/rubric`,
    ),
};
