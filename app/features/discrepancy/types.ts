export type DiscrepancyStatus = "open" | "resolved";

/**
 * One flagged case: the markers on this student disagreed by more than the module's
 * `discrepancyThreshold`.
 *
 * Carries the high and the low mark and **never which marker gave which** — that's the one
 * place a coordinator-facing view shows marks at all, and blind isolation still holds on who
 * said what. The backend doesn't send marker identities here; don't add them.
 */
export interface DiscrepancyCaseSummary {
  id: string;
  /** The student row's UUID. */
  studentId: string;
  /** The student's human-facing number, as imported from Learn. */
  studentToken: string;
  studentFullName: string;
  projectTitle: string;
  scoreHigh: number;
  scoreLow: number;
  status: DiscrepancyStatus;
  /** The mark a coordinator settled on. Null while the case is open. */
  agreedMark: number | null;
  flaggedAt: string;
  resolvedAt: string | null;
  resolvedByEmail: string | null;
  resolvedByFullName: string | null;
}
