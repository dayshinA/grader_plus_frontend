import { useQuery } from "@tanstack/react-query";

import { auditService } from "~/features/audit/api/audit.service";
import type { AuditQuery } from "~/features/audit/types";

export const auditKeys = {
  all: ["audit"] as const,
  platform: (query: AuditQuery) => [...auditKeys.all, "platform", query] as const,
  offering: (offeringId: string, limit?: number) =>
    [...auditKeys.all, "offering", offeringId, limit] as const,
  unit: (unitId: string, limit?: number) => [...auditKeys.all, "unit", unitId, limit] as const,
};

export function usePlatformAudit(query: AuditQuery) {
  return useQuery({
    queryKey: auditKeys.platform(query),
    queryFn: () => auditService.all(query),
    staleTime: 30 * 1000,
  });
}

export function useOfferingAudit(offeringId: string, limit = 200) {
  return useQuery({
    queryKey: auditKeys.offering(offeringId, limit),
    queryFn: () => auditService.forOffering(offeringId, limit),
    enabled: Boolean(offeringId),
    staleTime: 30 * 1000,
  });
}

export function useUnitAudit(unitId: string, limit = 200) {
  return useQuery({
    queryKey: auditKeys.unit(unitId, limit),
    queryFn: () => auditService.forUnit(unitId, limit),
    enabled: Boolean(unitId),
    staleTime: 30 * 1000,
  });
}
