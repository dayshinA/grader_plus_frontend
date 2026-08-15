import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type { PutRubricPayload, Rubric, WeightingCheck } from "~/features/rubrics/types";

/**
 * One rubric per offering, written and saved as a whole document rather than criterion by
 * criterion. Structural edits lock once any evaluation exists.
 */
export const rubricsService = {
  /** 404 when the offering has no rubric yet, which is a normal state during setup. */
  get(offeringId: string): Promise<Rubric> {
    return api.get<Rubric>(`/offerings/${offeringId}/rubric`);
  },

  /** A full replace. Adding, removing or reweighting is refused once marking has produced anything. */
  put(offeringId: string, payload: PutRubricPayload): Promise<ApiResult<Rubric>> {
    return apiWithMessage.put<Rubric>(`/offerings/${offeringId}/rubric`, payload);
  },

  /** Weightings total 100, checked to two decimals: 33.33 three times is 99.99. */
  validate(offeringId: string): Promise<WeightingCheck> {
    return api.get<WeightingCheck>(`/offerings/${offeringId}/rubric/validate`);
  },

  copyFrom(offeringId: string, sourceOfferingId: string): Promise<ApiResult<Rubric>> {
    return apiWithMessage.post<Rubric>(
      `/offerings/${offeringId}/rubric/copy-from/${sourceOfferingId}`,
    );
  },
};
