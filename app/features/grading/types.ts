import type { AssignmentRole } from "~/features/assignments/types";
import type { ProjectStatus } from "~/features/intake/types";
import type { RubricCriterion } from "~/features/rubrics/types";

// Mirrors src/grading. Everything here is coordinator facing: a marker never sees a case.

export const DISCREPANCY_STATUSES = ["open", "resolved"] as const;
export type DiscrepancyStatus = (typeof DISCREPANCY_STATUSES)[number];

export interface DiscrepancyCase {
  id: string;
  projectId: string;
  highTotal: number;
  lowTotal: number;
  spread: number;
  status: DiscrepancyStatus;
  openedAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  /** False when the coordinator took the average, true when they entered their own. */
  wasOverride: boolean;
}

/** A row of `GET /offerings/:id/discrepancies`. */
export interface DiscrepancyListItem {
  id: string;
  projectId: string;
  studentName: string;
  spread: number;
  status: DiscrepancyStatus;
  openedAt: string;
  resolvedAt: string | null;
}

/**
 * `GET /discrepancies/:id`. The one response in the system where two markers' work sits
 * side by side, and it is reachable only by the offering's coordinator.
 */
export interface MarkerEvaluationDetail {
  markerId: string;
  markerName: string;
  assignmentRole: AssignmentRole;
  totalPercentage: number | null;
  generalFeedback: string | null;
  scores: { criterionId: string; rawScore: number; comment: string | null }[];
}

export interface DiscrepancyDetail {
  case: DiscrepancyCase;
  project: { id: string; title: string; studentName: string };
  criteria: RubricCriterion[];
  markers: MarkerEvaluationDetail[];
  calculatedAverage: number;
}

export interface ResolveDiscrepancyPayload {
  /** True takes the calculated average, false requires a mark and a note. */
  acceptAverage: boolean;
  mark?: number;
  note?: string;
  comment?: string;
}

export const GRADE_SOURCES = [
  "automatic_average",
  "agreed_after_discrepancy",
  "exceptional_override",
] as const;
export type GradeSource = (typeof GRADE_SOURCES)[number];

export const GRADE_SOURCE_LABELS: Record<GradeSource, string> = {
  automatic_average: "Markers agreed",
  agreed_after_discrepancy: "Settled after discrepancy",
  exceptional_override: "Exceptional override",
};

export interface FinalGrade {
  id: string;
  projectId: string;
  mark: number;
  source: GradeSource;
  confirmedBy: string | null;
  reason: string | null;
  computedAt: string;
}

/** A row of `GET /offerings/:id/grades`. Grades come from final_grades and nowhere else. */
export interface OfferingGradeRow {
  projectId: string;
  learnId: string;
  studentName: string;
  title: string;
  status: ProjectStatus;
  excluded: boolean;
  /** Null while a case is open or nobody has finished. */
  mark: number | null;
  source: GradeSource | null;
}

export interface OverrideGradePayload {
  mark: number;
  /** At least ten characters. This is the exceptional path, not a way to settle a dispute. */
  reason: string;
}
