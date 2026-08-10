/**
 * Marker or moderator.
 *
 * A moderator is **not** a separate role or table — it's a `marker_assignments` row with
 * `assignmentRole: "moderator"`, graded blind exactly like any other marker and counting toward
 * the same 5-per-student cap. Don't build a separate moderator screen or role check.
 */
export type AssignmentRole = "marker" | "moderator";

/** `POST .../students/:studentId/marker-assignments`. */
export interface CreateMarkerAssignmentRequest {
  markerId: string;
  /** Defaults to `marker` server-side when omitted. */
  assignmentRole?: AssignmentRole;
}

/** One row of `GET .../marker-assignments`, enriched with student and marker detail. */
export interface MarkerAssignmentListItem {
  id: string;
  /** The student row's UUID. */
  studentId: string;
  markerId: string;
  assignmentRole: AssignmentRole;
  assignedAt: string;
  /** The student's human-facing number, as parsed from the Learn ZIP. */
  studentToken: string;
  studentFullName: string;
  projectTitle: string;
  markerEmail: string;
  markerFullName: string;
}

/**
 * `GET .../marker-candidates` — every user holding an active Marker role assignment, minus those
 * already on this module. Lets a coordinator reuse an existing Marker account across modules
 * rather than always minting a fresh one.
 */
export interface MarkerCandidateResponse {
  id: string;
  fullName: string;
  email: string;
}

export interface BulkAssignmentRowResult {
  row: number;
  /** The student *number* from the file, not a UUID. */
  studentId: string;
  markerEmail: string;
  status: "created" | "error";
  error?: string;
}

/** `POST .../marker-assignments/bulk-upload`. Bad rows are reported, not fatal to the batch. */
export interface BulkAssignmentResult {
  totalRows: number;
  createdCount: number;
  errorCount: number;
  results: BulkAssignmentRowResult[];
}
