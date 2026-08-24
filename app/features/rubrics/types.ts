// Mirrors src/rubrics. One rubric per offering, written and saved as a whole document.

export interface RubricCriterion {
  id: string;
  rubricId: string;
  label: string;
  description: string | null;
  /** A percentage. The set must total 100. */
  weighting: number;
  /** The raw scale a marker scores on. */
  maxScore: number;
  displayOrder: number;
  createdAt: string;
}

export interface Rubric {
  id: string;
  offeringId: string;
  title: string;
  updatedBy: string;
  criteria: RubricCriterion[];
  createdAt: string;
  updatedAt: string;
}

export interface PutRubricCriterion {
  label: string;
  description?: string;
  weighting: number;
  maxScore: number;
}

/** A full replace. What you send is what the offering has afterwards. */
export interface PutRubricPayload {
  title: string;
  criteria: PutRubricCriterion[];
}

/** `GET /offerings/:id/rubric/validate`. 33.33 three times is 99.99 and invalid. */
export interface WeightingCheck {
  valid: boolean;
  total: number;
  criteriaCount: number;
  message: string;
}
