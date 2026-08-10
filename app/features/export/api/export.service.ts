import type { GradeRow } from "~/features/export/types";
import { api } from "~/lib/api-client";

/**
 * Raw `ExportController` endpoint calls (`src/export/export.controller.ts`).
 *
 * The controller carries two routes over the same `final_grades` data at two altitudes:
 * `GET .../grades` (JSON, `grades.view` — School/Department Admin, System Administrator and the
 * module's Coordinator) and `GET .../export` (raw `text/csv` for Learn, `grades.export` — that
 * Coordinator alone). Only the first is built; the CSV download belongs here when it is, and
 * needs `responseType: "text"` since it's the one endpoint in the API that skips the JSON
 * envelope.
 */
export const exportService = {
  getGrades: (moduleId: string): Promise<GradeRow[]> =>
    api.get<GradeRow[]>(`/academic-modules/${moduleId}/grades`),
};
