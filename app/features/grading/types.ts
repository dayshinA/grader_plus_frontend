/**
 * The Marker's own grading surface: `GradingModule` server-side
 * (`evaluations.controller.ts`, `annotations.controller.ts`, and the `marker-rubric.controller.ts`
 * added 2026-08-10).
 *
 * Two things are true of every type in this file and must stay true:
 *
 * 1. **There is no `markerId` on any request.** Every route resolves "which marker" from the
 *    caller's own token — no `:markerId` path param exists anywhere on these controllers, so the
 *    usual "swap an id in the URL" attack shape is structurally impossible rather than merely
 *    guarded. Nothing here should ever gain a marker argument.
 * 2. **Every read returns only the caller's own work.** Another marker's evaluation, scores,
 *    feedback and annotations are not filtered out of the response — they are never queried. The
 *    UI must not imply others exist.
 *
 * Rejections are **404 `STUDENT_NOT_FOUND`**, not 403: `BlindIsolationGuard` answers "not
 * assigned", "doesn't exist" and "belongs to another module" identically so nothing leaks. Screens
 * must read a 404 on these routes as a boundary, not as "it was deleted".
 */

export type EvaluationStatus = "draft" | "final";

/** One criterion's score within the caller's own evaluation. */
export interface EvaluationScore {
  id: string;
  criterionId: string;
  score: number;
  feedback: string | null;
}

/** `GET/POST/PATCH .../evaluations[/me]`, and the response to every score upsert. */
export interface EvaluationResponse {
  id: string;
  studentId: string;
  markerId: string;
  rubricId: string;
  generalFeedback: string | null;
  status: EvaluationStatus;
  /**
   * Σ (score / maxScore) × weighting across every scored criterion, to 2dp. **Recalculated
   * server-side on every score write and returned with it** — never recompute it here, or a
   * rounding difference would show the marker a total the backend disagrees with.
   */
  totalScore: number;
  /** Stamped once, on the first draft → final transition. Never overwritten by later edits. */
  submittedAt: string | null;
  updatedAt: string;
  scores: EvaluationScore[];
}

/** `POST .../evaluations`. `rubricId` is resolved server-side from the module — never sent. */
export interface CreateEvaluationRequest {
  generalFeedback?: string;
}

/** `PATCH .../evaluations/me` — general feedback, the draft → final transition, or both. */
export interface UpdateEvaluationRequest {
  generalFeedback?: string;
  status?: EvaluationStatus;
}

/** `PUT .../evaluations/me/scores/:criterionId` — an upsert, so the same call creates or updates. */
export interface UpsertEvaluationScoreRequest {
  /** Integer ≥ 0, and ≤ the criterion's own `maxScore` (422 `SCORE_OUT_OF_RANGE` otherwise). */
  score: number;
  feedback?: string;
}

/** One of the caller's own annotations on one submission file. */
export interface AnnotationResponse {
  id: string;
  submissionId: string;
  markerId: string;
  /** 1-based. */
  pageNumber: number;
  /**
   * Fractions of the page, 0–1 — **not pixels**. The backend chose fractions so a pin lands in the
   * same place at any zoom level or window size, which is exactly what the viewer relies on.
   */
  posX: number;
  posY: number;
  content: string;
  highlightText: string | null;
  createdAt: string;
}

/** `POST .../submissions/:submissionId/annotations`. PDF and Word files only. */
export interface CreateAnnotationRequest {
  pageNumber: number;
  posX: number;
  posY: number;
  content: string;
  highlightText?: string;
}

/**
 * `PATCH .../annotations/:annotationId`.
 *
 * Position is **immutable** server-side — there is no reposition endpoint, deliberately. Moving a
 * pin means deleting it and creating another, so the UI offers delete rather than drag.
 */
export interface UpdateAnnotationRequest {
  content?: string;
  highlightText?: string;
}
