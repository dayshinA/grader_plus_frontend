import { api } from "~/lib/api-client";
import type { AuditLogEntry, AuditQuery } from "~/features/audit/types";

/**
 * Append only. There is no update route and no delete route, so nothing here builds a row
 * menu that would imply one.
 */
export const auditService = {
  /** The whole platform. System Administrator only. */
  all(query: AuditQuery = {}): Promise<AuditLogEntry[]> {
    return api.get<AuditLogEntry[]>("/admin/audit", {
      params: {
        action: query.action || undefined,
        actor: query.actor || undefined,
        limit: query.limit,
      },
    });
  },

  forOffering(offeringId: string, limit?: number): Promise<AuditLogEntry[]> {
    return api.get<AuditLogEntry[]>(`/offerings/${offeringId}/audit`, { params: { limit } });
  },

  forUnit(unitId: string, limit?: number): Promise<AuditLogEntry[]> {
    return api.get<AuditLogEntry[]>(`/units/${unitId}/audit`, { params: { limit } });
  },
};
