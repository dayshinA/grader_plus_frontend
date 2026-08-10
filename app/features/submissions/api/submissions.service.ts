import type {
  BulkSubmissionUploadResult,
  SubmissionDownloadResponse,
  SubmissionListItem,
} from "~/features/submissions/types";
import { api, apiWithMessage, type ApiResult } from "~/lib/api-client";

/**
 * Raw endpoint calls across the two submissions controllers
 * (`src/submissions/submissions.controller.ts` and `submission-downloads.controller.ts`).
 *
 * They're split server-side because the download surface needs marker access too, which a single
 * `@RequirePermission` scope check can't express — but from this side they're one domain, so one
 * service file.
 *
 * ⚠️ The two read calls sit behind `SubmissionAccessGuard`, which reads `module.coordinatorId`
 * **directly** and, uniquely in this API, does *not* cascade to Department or School Admin. So a
 * Department Admin who can open every other screen for this module gets a 403/404 here even though
 * they hold `submissions.view`. That's a deliberate backend quirk, not a bug — treat the failure
 * as a real permission boundary, never as an empty state.
 */
export const submissionsService = {
  /**
   * `POST /academic-modules/:moduleId/submissions/bulk-upload` — `multipart/form-data`, field
   * `file`. `.zip` only, 500MB cap (and 250MB per file inside it), enforced server-side; the
   * screen's `FileInput` pre-checks the same limits.
   *
   * Content-Type is deliberately left unset so the browser generates the multipart boundary —
   * hand-setting it would omit the boundary parameter. Same as `usersService.bulkImportUsers`.
   */
  bulkUpload: (
    moduleId: string,
    file: File,
  ): Promise<ApiResult<BulkSubmissionUploadResult>> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiWithMessage.post<BulkSubmissionUploadResult>(
      `/academic-modules/${moduleId}/submissions/bulk-upload`,
      formData,
    );
  },

  /** `GET .../students/:studentId/submissions` — every file uploaded for that student. */
  listForStudent: (moduleId: string, studentId: string): Promise<SubmissionListItem[]> =>
    api.get<SubmissionListItem[]>(
      `/academic-modules/${moduleId}/students/${studentId}/submissions`,
    ),

  /**
   * `GET .../submissions/:submissionId/download` — resolves a presigned R2 URL with a short TTL.
   *
   * Called on click rather than prefetched per row: the URL expires in 300 seconds, so one
   * resolved when the list rendered would be dead by the time anyone pressed it.
   */
  getDownloadUrl: (
    moduleId: string,
    studentId: string,
    submissionId: string,
  ): Promise<SubmissionDownloadResponse> =>
    api.get<SubmissionDownloadResponse>(
      `/academic-modules/${moduleId}/students/${studentId}/submissions/${submissionId}/download`,
    ),
};
