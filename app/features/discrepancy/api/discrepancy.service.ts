import type { DiscrepancyCaseSummary } from "~/features/discrepancy/types";
import { api } from "~/lib/api-client";

/**
 * Raw `DiscrepancyCasesController` endpoint calls
 * (`src/discrepancy/discrepancy-cases.controller.ts`).
 *
 * Read-only for now. `discrepancies.view` and `discrepancies.resolve` are two separate
 * permissions and holding one does not imply the other — Department Admin, School Admin and
 * System Administrator hold view alone, and only the module's own Coordinator can resolve.
 * The resolve call belongs here when that screen is built.
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
};
