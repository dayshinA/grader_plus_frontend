import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type {
  AutoAssignPayload,
  AutoAssignPreview,
  CreateAssignmentPayload,
  MarkerAssignment,
  ProjectCoverage,
  UpdateAssignmentPayload,
} from "~/features/assignments/types";
import type { ModuleOffering } from "~/features/structure/types";
import type { User } from "~/features/users/types";

// Names markers, correctly: blindness is between markers, not from a coordinator.
export const assignmentsService = {
  list(offeringId: string): Promise<MarkerAssignment[]> {
    return api.get<MarkerAssignment[]>(`/offerings/${offeringId}/assignments`);
  },

  /** Everyone holding marker on this offering, minus its coordinators. */
  eligibleMarkers(offeringId: string): Promise<User[]> {
    return api.get<User[]>(`/offerings/${offeringId}/markers`);
  },

  /** How many markers each project has. The gate on opening marking. */
  coverage(offeringId: string): Promise<ProjectCoverage[]> {
    return api.get<ProjectCoverage[]>(`/offerings/${offeringId}/assignments/coverage`);
  },

  create(
    offeringId: string,
    payload: CreateAssignmentPayload,
  ): Promise<ApiResult<MarkerAssignment>> {
    return apiWithMessage.post<MarkerAssignment>(`/offerings/${offeringId}/assignments`, payload);
  },

  /** A proposal, not a write. Nothing is saved until the rows are created individually. */
  proposeAuto(offeringId: string, payload: AutoAssignPayload): Promise<AutoAssignPreview> {
    return api.post<AutoAssignPreview>(`/offerings/${offeringId}/assignments/auto`, payload);
  },

  /** All or nothing: every row is resolved and checked before anything is written. */
  importMatrix(offeringId: string, file: File): Promise<ApiResult<MarkerAssignment[]>> {
    const body = new FormData();
    body.append("file", file);
    return apiWithMessage.post<MarkerAssignment[]>(
      `/offerings/${offeringId}/assignments/import`,
      body,
    );
  },

  updateRole(
    assignmentId: string,
    payload: UpdateAssignmentPayload,
  ): Promise<ApiResult<MarkerAssignment>> {
    return apiWithMessage.patch<MarkerAssignment>(`/assignments/${assignmentId}`, payload);
  },

  remove(assignmentId: string): Promise<ApiResult<MarkerAssignment>> {
    return apiWithMessage.delete<MarkerAssignment>(`/assignments/${assignmentId}`);
  },

  /** Refused unless the rubric is valid and every project has two markers. */
  openMarking(offeringId: string): Promise<ApiResult<ModuleOffering>> {
    return apiWithMessage.post<ModuleOffering>(`/offerings/${offeringId}/open-marking`);
  },
};
