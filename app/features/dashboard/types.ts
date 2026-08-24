import type { AssignmentRole } from "~/features/assignments/types";
import type { AcademicUnitLevel, OfferingStatus } from "~/features/structure/types";

// Mirrors src/dashboard. No response here has a score column, fetched or otherwise.

/** `GET /me/home`. Already shaped for the caller, so the screen renders what it is given. */
export interface HomeSummary {
  outstandingMarking: number;
  coordinates: {
    offeringId: string;
    moduleCode: string;
    moduleTitle: string;
    academicYear: string;
    status: OfferingStatus;
  }[];
  administers: {
    unitId: string;
    name: string;
    level: AcademicUnitLevel;
  }[];
  isSystemAdmin: boolean;
}

/** States, and when. Never a total. */
export type MarkerProgressState = "not_started" | "draft" | "submitted";

export const MARKER_PROGRESS_LABELS: Record<MarkerProgressState, string> = {
  not_started: "Not started",
  draft: "In draft",
  submitted: "Submitted",
};

export interface OfferingDashboard {
  offering: {
    id: string;
    academicYear: string;
    status: OfferingStatus;
    markingDeadline: string | null;
    discrepancyThreshold: number;
    /** Display only. Nothing refuses a write because the deadline passed. */
    daysToDeadline: number | null;
  };
  progress: {
    projects: number;
    excluded: number;
    awaitingMarking: number;
    inProgress: number;
    awaitingModeration: number;
    graded: number;
    openCases: number;
  };
  projects: {
    projectId: string;
    studentName: string;
    excluded: boolean;
    markers: {
      markerId: string;
      markerName: string;
      assignmentRole: AssignmentRole;
      state: MarkerProgressState;
      submittedAt: string | null;
    }[];
  }[];
}

/** `GET /units/:id/dashboard`. A school plus its constituent units, or one unit alone. */
export interface UnitDashboard {
  unit: { id: string; name: string; level: AcademicUnitLevel };
  totals: {
    offerings: number;
    inMarking: number;
    openCases: number;
    projects: number;
    graded: number;
  };
  offerings: {
    offeringId: string;
    academicYear: string;
    moduleCode: string;
    moduleTitle: string;
    unitName: string;
    status: OfferingStatus;
    markingDeadline: string | null;
    projects: number;
    graded: number;
    openCases: number;
    completion: number;
  }[];
}

/** `GET /admin/overview`. Counts of what the platform holds, for the person who runs it. */
export interface AdminOverview {
  accounts: {
    total: number;
    active: number;
    activeRoleGrants: number;
  };
  structure: {
    schools: number;
    constituentUnits: number;
    programmes: number;
    modules: number;
  };
  work: {
    offerings: number;
    openOfferings: number;
    projects: number;
    gradedProjects: number;
    openDiscrepancies: number;
  };
}
