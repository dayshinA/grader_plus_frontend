export type MarkingStatus = "not_started" | "draft" | "final";
export type OverallStatus = "not_started" | "in_progress" | "complete";
export type AssignmentRole = "marker" | "moderator";

export interface DashboardMarkerStatus {
  markerId: string;
  markerEmail: string;
  markerFullName: string;
  assignmentRole: AssignmentRole;
  status: MarkingStatus;
  submittedAt: string | null;
}

/** Never carries totalScore/generalFeedback/scores — blind isolation extends to
 * coordinators until a discrepancy is resolved. Don't add score fields here. */
export interface DashboardStudentEntry {
  studentId: string;
  studentCode: string;
  fullName: string;
  projectTitle: string;
  markers: DashboardMarkerStatus[];
  completedCount: number;
  totalMarkers: number;
  overallStatus: OverallStatus;
}

export interface DashboardResponse {
  moduleId: string;
  markingDeadline: string;
  deadlineApproaching: boolean;
  students: DashboardStudentEntry[];
}

/**
 * One row of `GET /markers/me/dashboard` — the Marker's own cross-module "things to do" list.
 *
 * Structurally close to `DashboardStudentEntry` above but a different thing entirely: that one is
 * a coordinator's module-wide view with a `markers[]` array, this one is a single marker's own
 * assignments across every module, with **no** cross-marker field anywhere. `status` is the
 * caller's own evaluation state and never another marker's — the backend filters on `markerId`
 * from the start rather than after the fact.
 */
export interface MarkerDashboardItem {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  /** The uuid — what every `.../students/:studentId/...` route takes. */
  studentId: string;
  /** The Learn-parsed token (e.g. "S100"). Display only; never put this in a URL. */
  studentCode: string;
  studentFullName: string;
  projectTitle: string;
  /** A moderator is a marker with a different `assignment_role`, not a different role. */
  assignmentRole: AssignmentRole;
  status: MarkingStatus;
  submittedAt: string | null;
}
