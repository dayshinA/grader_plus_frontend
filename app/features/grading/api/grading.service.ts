import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type {
  DiscrepancyDetail,
  DiscrepancyListItem,
  FinalGrade,
  OfferingGradeRow,
  OverrideGradePayload,
  ResolveDiscrepancyPayload,
} from "~/features/grading/types";
import type { ModuleOffering } from "~/features/structure/types";

// The only module that writes a grade, and the only place both markers' work is visible.
export const gradingService = {
  listDiscrepancies(offeringId: string): Promise<DiscrepancyListItem[]> {
    return api.get<DiscrepancyListItem[]>(`/offerings/${offeringId}/discrepancies`);
  },

  /** Both markers side by side. Coordinator only, and only once a case exists. */
  discrepancy(caseId: string): Promise<DiscrepancyDetail> {
    return api.get<DiscrepancyDetail>(`/discrepancies/${caseId}`);
  },

  /** Accepting the calculated average, or overriding it with a required reason. */
  resolveDiscrepancy(
    caseId: string,
    payload: ResolveDiscrepancyPayload,
  ): Promise<ApiResult<unknown>> {
    return apiWithMessage.post(`/discrepancies/${caseId}/resolve`, payload);
  },

  /** From final_grades and nowhere else. A project with an open case has no grade yet. */
  listGrades(offeringId: string): Promise<OfferingGradeRow[]> {
    return api.get<OfferingGradeRow[]>(`/offerings/${offeringId}/grades`);
  },

  grade(projectId: string): Promise<FinalGrade> {
    return api.get<FinalGrade>(`/projects/${projectId}/grade`);
  },

  // The exceptional path. Refused while a case is open, because that is a moderation.
  overrideGrade(
    projectId: string,
    payload: OverrideGradePayload,
  ): Promise<ApiResult<FinalGrade>> {
    return apiWithMessage.post<FinalGrade>(`/projects/${projectId}/grade/override`, payload);
  },

  /** The freeze. Every write on the offering is refused afterwards. */
  closeOffering(offeringId: string): Promise<ApiResult<ModuleOffering>> {
    return apiWithMessage.post<ModuleOffering>(`/offerings/${offeringId}/close`);
  },
};
