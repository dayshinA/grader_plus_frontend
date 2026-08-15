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

/**
 * The offering itself, for the frame around the coordinator surface.
 *
 * There is no `GET /offerings/:id` in the API, so this reads the header out of
 * `GET /offerings/:id/dashboard`, which carries everything the chrome needs except
 * `maxMarkersPerProject`. That one is fixed at creation and has no read route, so nothing
 * displays it.
 */
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
