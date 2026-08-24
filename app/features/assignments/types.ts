import type { Project } from "~/features/intake/types";
import type { User } from "~/features/users/types";

// A value on the assignment, not a role. Every value marks blind, moderator included.
export const ASSIGNMENT_ROLES = [
  "first_marker",
  "second_marker",
  "additional_marker",
  "moderator",
] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

export const ASSIGNMENT_ROLE_LABELS: Record<AssignmentRole, string> = {
  first_marker: "First marker",
  second_marker: "Second marker",
  additional_marker: "Additional marker",
  moderator: "Moderator",
};

export interface MarkerAssignment {
  id: string;
  projectId: string;
  markerId: string;
  assignmentRole: AssignmentRole;
  assignedBy: string;
  assignedAt: string;
  /** Joined in by `GET /offerings/:id/assignments`. */
  marker?: User;
  project?: Project;
}

export interface CreateAssignmentPayload {
  projectId: string;
  markerId: string;
  assignmentRole: AssignmentRole;
}

export interface UpdateAssignmentPayload {
  assignmentRole: AssignmentRole;
}

/** `GET /offerings/:id/assignments/coverage`. The gate on opening marking. */
export interface ProjectCoverage {
  projectId: string;
  studentName: string;
  markerCount: number;
}

export interface AutoAssignPayload {
  /** Everyone in the pool must hold marker on this offering. Two minimum. */
  markerIds: string[];
  maxPerMarker?: number;
}

export interface ProposedAssignment {
  projectId: string;
  studentName: string;
  markerId: string;
  markerName: string;
  assignmentRole: AssignmentRole;
}

/** `POST /offerings/:id/assignments/auto` proposes. It does not save anything. */
export interface AutoAssignPreview {
  proposed: ProposedAssignment[];
  skipped: { projectId: string; studentName: string; reason: string }[];
  perMarker: { markerId: string; markerName: string; projects: number }[];
}
