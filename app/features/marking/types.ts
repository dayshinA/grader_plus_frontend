import type { Submission } from "~/features/intake/types";
import type { OfferingStatus } from "~/features/structure/types";
import type { Rubric } from "~/features/rubrics/types";

/**
 * Mirrors src/marking. Nothing in this file names another marker, and nothing in it
 * carries a marker identity: which marker is always the token.
 */

export const EVALUATION_STATUSES = ["draft", "final"] as const;
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

/** The caller's own state on a queue row. Never anybody else's, never a count of others. */
export type QueueState = "not_started" | EvaluationStatus;

export const QUEUE_STATE_LABELS: Record<QueueState, string> = {
  not_started: "Not started",
  draft: "In draft",
  final: "Submitted",
};

/** A row of `GET /me/marking-queue`. */
export interface MarkingQueueItem {
  projectId: string;
  title: string;
  studentName: string;
  moduleCode: string;
  academicYear: string;
  markingDeadline: string | null;
  offeringStatus: OfferingStatus;
  myStatus: QueueState;
  mySubmittedAt: string | null;
}

export interface CriterionScore {
  id: string;
  evaluationId: string;
  criterionId: string;
  rawScore: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The caller's own evaluation. There is no route that returns anybody else's. */
export interface OwnEvaluation {
  id: string;
  status: EvaluationStatus;
  /** Recomputed server side on every save. Never computed in the browser. */
  totalPercentage: number | null;
  generalFeedback: string | null;
  submittedAt: string | null;
  scores: CriterionScore[];
}

/** `GET /marking/projects/:id`. */
export interface MarkingWorkspace {
  project: {
    id: string;
    title: string;
    studentName: string;
    supervisorName: string | null;
  };
  rubric: Rubric;
  files: Submission[];
  myEvaluation: OwnEvaluation | null;
}

/** What a save answers with: the evaluation row, total included. */
export interface EvaluationRow {
  id: string;
  assignmentId: string;
  status: EvaluationStatus;
  totalPercentage: number | null;
  generalFeedback: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PutScoresPayload {
  scores: { criterionId: string; rawScore: number; comment?: string }[];
}

export interface PutFeedbackPayload {
  generalFeedback: string;
}

/** A pin on the caller's own evaluation. Two markers on one page never see each other's. */
export interface Annotation {
  id: string;
  evaluationId: string;
  submissionId: string;
  page: number;
  /** Normalised 0 to 1, so a pin lands in the same place at any zoom. */
  x: number;
  y: number;
  quotedText: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnotationPayload {
  page: number;
  x: number;
  y: number;
  quotedText?: string;
  body: string;
}

export interface UpdateAnnotationPayload {
  body: string;
}
