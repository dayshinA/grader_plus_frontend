import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type {
  CreateProjectPayload,
  ExcludeProjectPayload,
  IntakeJob,
  IntakeRunResult,
  Project,
  Submission,
  SubmissionUrl,
  UpdateProjectPayload,
} from "~/features/intake/types";

export const intakeService = {
  // A progress callback, so a slow archive shows progress rather than a silent spinner.
  uploadArchive(
    offeringId: string,
    file: File,
    onUploadProgress?: (percent: number) => void,
  ): Promise<ApiResult<IntakeRunResult>> {
    const body = new FormData();
    body.append("file", file);

    const url = `/offerings/${offeringId}/intake`;
    const startedAt = performance.now();
    console.log("[intake] upload starting", {
      url,
      name: file.name,
      bytes: file.size,
      type: file.type,
    });

    return apiWithMessage
      .post<IntakeRunResult>(url, body, {
        // The walk happens after the bytes land, so the default 30 seconds is not enough.
        timeout: 10 * 60 * 1000,
        onUploadProgress: (event) => {
          // Whether any bytes left the browser is what matters when a request dies below HTTP.
          console.log("[intake] bytes sent", {
            loaded: event.loaded,
            total: event.total ?? "unknown",
          });
          if (!onUploadProgress || !event.total) return;
          onUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      })
      .then((result) => {
        console.log("[intake] upload finished", {
          ms: Math.round(performance.now() - startedAt),
          jobId: result.data.jobId,
          report: result.data.report,
        });
        return result;
      })
      .catch((error: unknown) => {
        console.error("[intake] upload failed", {
          ms: Math.round(performance.now() - startedAt),
          error,
        });
        throw error;
      });
  },

  report(offeringId: string, jobId: string): Promise<IntakeJob> {
    return api.get<IntakeJob>(`/offerings/${offeringId}/intake/report/${jobId}`);
  },

  listProjects(offeringId: string): Promise<Project[]> {
    return api.get<Project[]>(`/offerings/${offeringId}/projects`);
  },

  getProject(projectId: string): Promise<Project> {
    return api.get<Project>(`/projects/${projectId}`);
  },

  /** Manual entry, for the folder the archive could not parse and for a late addition. */
  createProject(
    offeringId: string,
    payload: CreateProjectPayload,
  ): Promise<ApiResult<Project>> {
    return apiWithMessage.post<Project>(`/offerings/${offeringId}/projects`, payload);
  },

  updateProject(projectId: string, payload: UpdateProjectPayload): Promise<ApiResult<Project>> {
    return apiWithMessage.patch<Project>(`/projects/${projectId}`, payload);
  },

  /** Refused once a file is attached or any marking exists. Exclude instead. */
  deleteProject(projectId: string): Promise<ApiResult<Project>> {
    return apiWithMessage.delete<Project>(`/projects/${projectId}`);
  },

  /** A coordinator saying this work can never be graded. The reason is required and kept. */
  excludeProject(
    projectId: string,
    payload: ExcludeProjectPayload,
  ): Promise<ApiResult<Project>> {
    return apiWithMessage.post<Project>(`/projects/${projectId}/exclude`, payload);
  },

  includeProject(projectId: string): Promise<ApiResult<Project>> {
    return apiWithMessage.delete<Project>(`/projects/${projectId}/exclude`);
  },

  listSubmissions(projectId: string): Promise<Submission[]> {
    return api.get<Submission[]>(`/projects/${projectId}/submissions`);
  },

  uploadSubmission(projectId: string, file: File): Promise<ApiResult<Submission>> {
    const body = new FormData();
    body.append("file", file);
    return apiWithMessage.post<Submission>(`/projects/${projectId}/submissions`, body, {
      timeout: 5 * 60 * 1000,
    });
  },

  /** Refused once marking has started, because deleting a file moves an annotation. */
  deleteSubmission(submissionId: string): Promise<ApiResult<Submission>> {
    return apiWithMessage.delete<Submission>(`/submissions/${submissionId}`);
  },

  /** Short lived and signed. Ask at the moment of use rather than holding it in state. */
  submissionUrl(submissionId: string): Promise<SubmissionUrl> {
    return api.get<SubmissionUrl>(`/submissions/${submissionId}/url`);
  },
};
