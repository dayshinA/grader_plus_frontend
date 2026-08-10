import type { DiscrepancyCaseSummary } from "~/features/discrepancy/types";
import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";

/**
 * Raw `DiscrepancyCasesController` endpoint calls
 * (`src/discrepancy/discrepancy-cases.controller.ts`).
 *
 * `discrepancies.view` and `discrepancies.resolve` are separate permissions and holding one does
 * not imply the other — Department Admin, School Admin and System Administrator hold view alone,
 * and only the module's own Coordinator can resolve.
 */
export const discrepancyService = {
  /**
   * `GET /academic-modules/:moduleId/discrepancy-cases`.
   *
   * The endpoint takes an optional `?status=` filter, deliberately unused: the backend has no
   * pagination anywhere, so one fetch returns every case and the screen's tabs filter that in
   * the client rather than refetching per tab.
   */
  getCases: (moduleId: string): Promise<DiscrepancyCaseSummary[]> =>
    api.get<DiscrepancyCaseSummary[]>(
      `/academic-modules/${moduleId}/discrepancy-cases`,
    ),

  /**
   * `PATCH .../discrepancy-cases/:caseId/resolve` — records the agreed mark.
   *
   * Writes a `final_grades` row stamped with who confirmed it and **permanently locks** the
   * student: later score edits by any marker stop recomputing anything at all. An
   * already-resolved case returns 422. There is no un-resolve route.
   */
  resolveCase: (
    moduleId: string,
    caseId: string,
    agreedMark: number,
  ): Promise<ApiResult<DiscrepancyCaseSummary>> =>
    apiWithMessage.patch<DiscrepancyCaseSummary>(
      `/academic-modules/${moduleId}/discrepancy-cases/${caseId}/resolve`,
      { agreedMark },
    ),
};
