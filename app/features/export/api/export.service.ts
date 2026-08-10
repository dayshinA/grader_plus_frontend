import type { GradeRow } from "~/features/export/types";
import { api, type RawApiResult } from "~/lib/api-client";

/**
 * Raw `ExportController` endpoint calls (`src/export/export.controller.ts`).
 *
 * The controller carries two routes over the same `final_grades` data at two altitudes:
 * `GET .../grades` (JSON, `grades.view` — School/Department Admin, System Administrator and the
 * module's Coordinator) and `GET .../export` (raw `text/csv` for Learn, `grades.export` — that
 * Coordinator alone).
 */
export const exportService = {
  getGrades: (moduleId: string): Promise<GradeRow[]> =>
    api.get<GradeRow[]>(`/academic-modules/${moduleId}/grades`),

  /**
   * `GET .../export` — the Learn-format CSV.
   *
   * **The one endpoint in this API that skips the JSON envelope**, which is why it goes through
   * `api.getRaw` rather than `api.get`; see that helper for what the difference buys.
   *
   * `studentIds` is comma-separated; ids that are unknown, malformed, or belong to another module
   * are silently dropped rather than erroring, as are students with no final grade — so a filtered
   * export can legitimately come back with fewer rows than ids requested, or empty.
   *
   * `includeFeedback` appends every final evaluation's general feedback, labelled by marker. It is
   * the only route in the system that exposes feedback text at all.
   */
  exportGradesCsv: (
    moduleId: string,
    options?: { studentIds?: string[]; includeFeedback?: boolean },
  ): Promise<RawApiResult<string>> => {
    const params = new URLSearchParams();
    if (options?.studentIds?.length) {
      params.set("studentIds", options.studentIds.join(","));
    }
    if (options?.includeFeedback) {
      params.set("includeFeedback", "true");
    }
    const query = params.toString();
    return api.getRaw<string>(
      `/academic-modules/${moduleId}/export${query ? `?${query}` : ""}`,
    );
  },
};
