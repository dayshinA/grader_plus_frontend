/** One row of the rubric — what a marker scores, and what it's worth. */
export interface RubricCriterionResponse {
  id: string;
  label: string;
  description: string;
  /** Percentage of the final mark this criterion carries. All criteria must sum to 100. */
  weighting: number;
  /** The highest raw score a marker can give this criterion. */
  maxScore: number;
  displayOrder: number;
}

/** One rubric per module — enforced by a unique constraint on `rubrics.module_id`. */
export interface RubricResponse {
  id: string;
  moduleId: string;
  title: string;
  createdAt: string;
  /** Already sorted by `displayOrder` server-side. */
  criteria: RubricCriterionResponse[];
}
