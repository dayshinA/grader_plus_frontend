// Mirrors src/intake. Students are records parsed out of a Learn export, never accounts.

export const PROJECT_STATUSES = [
  "awaiting_marking",
  "in_progress",
  "awaiting_moderation",
  "graded",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  awaiting_marking: "Awaiting marking",
  in_progress: "In progress",
  awaiting_moderation: "Awaiting moderation",
  graded: "Graded",
};

export interface Student {
  id: string;
  learnId: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  offeringId: string;
  studentId: string;
  /** Present on the list and detail reads, which join the student in. */
  student?: Student;
  title: string;
  /** Frozen at intake, so a later correction does not rewrite a closed offering. */
  studentNameSnapshot: string;
  /** A name on the project. It grants nothing. */
  supervisorName: string | null;
  supervisorUserId: string | null;
  status: ProjectStatus;
  excludedAt: string | null;
  exclusionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  learnId: string;
  studentName: string;
  title: string;
  supervisorName?: string;
  supervisorUserId?: string;
}

export interface UpdateProjectPayload {
  title?: string;
  /** Corrects the name on this project only. The student record is untouched. */
  studentName?: string;
  supervisorName?: string | null;
  supervisorUserId?: string | null;
}

export interface ExcludeProjectPayload {
  /** At least five characters, and it stays on the record. */
  reason: string;
}

export interface Submission {
  id: string;
  projectId: string;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  /** PDF only in practice. Anything else is download only. */
  isAnnotatable: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

/** `GET /submissions/:id/url`. Short lived, so ask at the moment of use. */
export interface SubmissionUrl {
  url: string;
  originalFilename: string;
  mimeType: string;
  isAnnotatable: boolean;
}

export const INTAKE_JOB_STATUSES = ["running", "finished", "failed"] as const;
export type IntakeJobStatus = (typeof INTAKE_JOB_STATUSES)[number];

/** What the archive walk found. Failures are named individually, never guessed at. */
export interface IntakeReport {
  created: number;
  matchedExisting: number;
  filesStored: number;
  filesReplaced: number;
  filesKeptBecauseAnnotated: string[];
  failed: { folder: string; reason: string }[];
}

export interface IntakeRunResult {
  jobId: string;
  report: IntakeReport;
}

export interface IntakeJob {
  id: string;
  offeringId: string;
  uploadedBy: string;
  originalFilename: string;
  status: IntakeJobStatus;
  report: IntakeReport | null;
  startedAt: string;
  finishedAt: string | null;
}
