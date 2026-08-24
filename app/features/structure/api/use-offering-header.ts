import { useOfferingDashboard } from "~/features/dashboard/api/use-dashboard";
import type { OfferingStatus } from "~/features/structure/types";

export interface OfferingHeader {
  id: string;
  academicYear: string;
  status: OfferingStatus;
  markingDeadline: string | null;
  discrepancyThreshold: number;
  daysToDeadline: number | null;
  /** True once closed, which is when every write on the offering starts answering 403. */
  isClosed: boolean;
}

// There is no `GET /offerings/:id`, so the header comes out of the dashboard response.
export function useOfferingHeader(offeringId: string) {
  const query = useOfferingDashboard(offeringId);
  const offering = query.data?.offering;

  const header: OfferingHeader | undefined = offering
    ? {
        id: offering.id,
        academicYear: offering.academicYear,
        status: offering.status,
        markingDeadline: offering.markingDeadline,
        discrepancyThreshold: offering.discrepancyThreshold,
        daysToDeadline: offering.daysToDeadline,
        isClosed: offering.status === "closed",
      }
    : undefined;

  return { ...query, offering: header };
}
