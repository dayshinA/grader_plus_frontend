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
