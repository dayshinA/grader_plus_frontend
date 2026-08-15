import { api } from "~/lib/api-client";
import type { RawApiResult } from "~/lib/api-client";
import type { ExportPreview } from "~/features/export/types";

/**
 * Reads final_grades and nothing else.
 *
 * The preview is JSON through the usual envelope. The three downloads are raw files with no
 * envelope at all, so they come back as a Blob and are handed to the browser as downloads
 * rather than parsed.
 */
export const exportService = {
  /** Always read first. It names every gap with its reason. */
  preview(offeringId: string): Promise<ExportPreview> {
    return api.get<ExportPreview>(`/offerings/${offeringId}/export/preview`);
  },

  /** A CSV of marks. Projects without a final grade are simply absent from it. */
  grades(offeringId: string): Promise<RawApiResult<Blob>> {
    return api.download(`/offerings/${offeringId}/export/grades`);
  },

  /** A zip of one Markdown document per graded project. Annotations are not included. */
  feedbackBundle(offeringId: string): Promise<RawApiResult<Blob>> {
    return api.download(`/offerings/${offeringId}/export/feedback`);
  },

  /** One project's feedback document. It names no marker: it says what was said. */
  projectFeedback(projectId: string): Promise<RawApiResult<Blob>> {
    return api.download(`/projects/${projectId}/export/feedback`);
  },
};
