import type { OfferingStatus } from "~/features/structure/types";

/**
 * Mirrors src/export. The preview is JSON; the two downloads are raw files with no
 * envelope, handled as downloads rather than parsed.
 */
export interface ExportPreview {
  offering: {
    id: string;
    academicYear: string;
    status: OfferingStatus;
  };
  counts: {
    projects: number;
    exportable: number;
    excluded: number;
    missingGrade: number;
    openDiscrepancies: number;
  };
  /** Every gap, with the reason. This is what makes an incomplete export a decision. */
  missing: {
    projectId: string;
    learnId: string;
    studentName: string;
    title: string;
    reason: string;
  }[];
  warning: string;
}
