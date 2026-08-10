/**
 * How a final grade came to be.
 *
 * - `average` — no discrepancy; the markers' totals were averaged automatically. `confirmedBy`
 *   is null, because no human confirmed it.
 * - `agreed_after_discrepancy` — a coordinator resolved a flagged case and this is the mark
 *   they settled on.
 * - `coordinator_confirmed` — reserved by the locked ERD, not written by any current code path.
 */
export type GradeSource = "average" | "coordinator_confirmed" | "agreed_after_discrepancy";

/**
 * One row of `GET /academic-modules/:moduleId/grades`.
 *
 * Read exclusively from `final_grades`, never from `evaluations` — a student with no final
 * grade is silently omitted rather than returned with a null score, so this list is always
 * shorter than the module's cohort until every project has landed.
 *
 * Carries no feedback text: that lives behind the CSV export's opt-in `includeFeedback`
 * column, which needs `grades.export`.
 */
export interface GradeRow {
  /** The student's human-facing number as imported from Learn, not the student row's UUID. */
  studentId: string;
  finalScore: number;
  gradeSource: GradeSource;
  /** The user id who confirmed it. Null for `average` — nothing human confirmed it. */
  confirmedBy: string | null;
  confirmedAt: string;
}
