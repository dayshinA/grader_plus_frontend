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

/** `POST .../rubric` — the shell only. Criteria are added afterwards, one call each. */
export interface CreateRubricRequest {
  title: string;
}

/** `PATCH .../rubric`. Title is the only editable field on the shell. */
export interface UpdateRubricRequest {
  title?: string;
}

/**
 * `POST .../rubric/criteria`.
 *
 * `displayOrder` is deliberately never sent by this app — the backend auto-assigns `MAX + 1`,
 * which is what "add another criterion to the end" means, and hand-managing the ordering client
 * side would need a reorder UI the requirements don't ask for.
 */
export interface CreateRubricCriterionRequest {
  label: string;
  description: string;
  /** 0-100, at most 2 decimal places (backend `numeric(5,2)`). */
  weighting: number;
  /** Integer, 1-1000. */
  maxScore: number;
}

/** `PATCH .../rubric/criteria/:criterionId`. Partial of the create shape. */
export type UpdateRubricCriterionRequest = Partial<CreateRubricCriterionRequest>;
