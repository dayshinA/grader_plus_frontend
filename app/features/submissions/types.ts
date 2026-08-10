/** Coarse bucket the backend infers from a file's extension (`inferFileType`). */
export type SubmissionFileType = "pdf" | "word" | "code" | "video" | "other";

/** One file belonging to a student, from `GET .../students/:studentId/submissions`. */
export interface SubmissionListItem {
  id: string;
  originalFilename: string;
  fileType: SubmissionFileType | string;
  uploadedAt: string;
}

/**
 * `GET .../submissions/:submissionId/download`.
 *
 * The bytes never pass through this API — the backend hands back a presigned R2 URL and the
 * browser fetches the file directly. The R2 object key itself is never exposed.
 */
export interface SubmissionDownloadResponse {
  url: string;
  originalFilename: string;
  /** Presigned URL lifetime. 300s at the time of writing, echoed by the backend so the UI can
   * say so rather than hardcoding it. */
  expiresInSeconds: number;
}

/** Why a ZIP entry couldn't be turned into a student. */
export type UnparsedZipEntryReason =
  | "FILE_NOT_IN_STUDENT_FOLDER"
  | "FOLDER_NAME_FORMAT_INVALID"
  | "METADATA_VALIDATION_FAILED"
  | "FILE_TOO_LARGE";

/** A top-level ZIP entry the backend couldn't parse. These are the ones a coordinator must fix. */
export interface UnparsedZipEntry {
  rawEntryName: string;
  reason: UnparsedZipEntryReason;
  detail?: string;
  files: string[];
}

export interface SubmissionUploadFileResult {
  originalFilename: string;
  storagePath: string;
  fileType: string;
  status: "created" | "error";
  error?: string;
}

export interface SubmissionUploadStudentResult {
  /** The student's human-facing number parsed out of the folder name, not a UUID. */
  studentId: string;
  fullName: string;
  projectTitle: string;
  status: "student_created" | "submissions_added" | "error";
  error?: string;
  files: SubmissionUploadFileResult[];
}

/**
 * `POST .../submissions/bulk-upload`.
 *
 * Nothing aborts the batch: a folder that won't parse lands in `unparsed`, and a file that won't
 * upload is reported against its own student with `status: "error"`. So a "successful" response
 * can still describe a partly-failed import, and the screen has to show both halves.
 */
export interface BulkSubmissionUploadResult {
  totalEntries: number;
  studentsProcessed: number;
  studentsFlagged: number;
  filesUploaded: number;
  results: SubmissionUploadStudentResult[];
  unparsed: UnparsedZipEntry[];
}
