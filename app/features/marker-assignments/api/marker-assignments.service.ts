import type {
  BulkAssignmentResult,
  CreateMarkerAssignmentRequest,
  MarkerAssignmentListItem,
  MarkerCandidateResponse,
} from "~/features/marker-assignments/types";
import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";

/**
 * Raw `MarkerAssignmentsController` endpoint calls
 * (`src/marker-assignments/marker-assignments.controller.ts`).
 *
 * ⚠️ Unusually for this API, `markers.assign` is held **only** by a module-scoped Project
 * Coordinator. No admin tier holds it at any scope — not Department Admin, not School Admin, not
 * System Administrator — so unlike almost every other module-scoped route these do *not* cascade
 * up through oversight containment. Nobody above the Coordinator can assign or remove markers on
 * their behalf.
 *
 * `getCandidates` is the exception on this same controller: it carries `roles.view_candidates`
 * instead, which does cascade normally.
 */
export const markerAssignmentsService = {
  /** `GET .../marker-candidates` — `roles.view_candidates` @ module (cascades, unlike the rest). */
  getCandidates: (moduleId: string): Promise<MarkerCandidateResponse[]> =>
    api.get<MarkerCandidateResponse[]>(
      `/academic-modules/${moduleId}/marker-candidates`,
    ),

  /**
   * `GET .../marker-assignments` — every assignment in the module.
   *
   * The endpoint takes an optional `?studentId=` (a student **UUID**), deliberately unused: the
   * backend has no pagination anywhere, so one fetch returns the lot and the screen groups it
   * client-side rather than firing a request per student.
   */
  getAssignments: (moduleId: string): Promise<MarkerAssignmentListItem[]> =>
    api.get<MarkerAssignmentListItem[]>(
      `/academic-modules/${moduleId}/marker-assignments`,
    ),

  /**
   * `POST .../students/:studentId/marker-assignments`.
   *
   * Up to 5 markers per student, moderators included. The module's own coordinator can never be
   * assigned to it (422) — which is also why a Coordinator can never satisfy `BlindIsolationGuard`
   * on their own module, and so why `evaluations.view`/`annotations.view` do nothing for them.
   */
  assign: (
    moduleId: string,
    studentId: string,
    request: CreateMarkerAssignmentRequest,
  ): Promise<ApiResult<MarkerAssignmentListItem>> =>
    apiWithMessage.post<MarkerAssignmentListItem>(
      `/academic-modules/${moduleId}/students/${studentId}/marker-assignments`,
      request,
    ),

  /** `DELETE .../marker-assignments/:assignmentId` — hard delete. Does **not** touch an
   * evaluation the marker had already started. */
  unassign: (moduleId: string, assignmentId: string): Promise<ApiResult<unknown>> =>
    apiWithMessage.delete<unknown>(
      `/academic-modules/${moduleId}/marker-assignments/${assignmentId}`,
    ),

  /**
   * `POST .../marker-assignments/bulk-upload` — `multipart/form-data`, field `file`.
   * `.csv`/`.xlsx`, 2MB cap.
   *
   * Columns: `studentId` (the student **number**, not a UUID — coordinators author this by hand
   * and never see internal uuids), `markerEmail`, and optional `role` (`marker`|`moderator`).
   *
   * Content-Type is left unset so the browser generates the multipart boundary.
   */
  bulkAssign: (moduleId: string, file: File): Promise<ApiResult<BulkAssignmentResult>> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiWithMessage.post<BulkAssignmentResult>(
      `/academic-modules/${moduleId}/marker-assignments/bulk-upload`,
      formData,
    );
  },
};
