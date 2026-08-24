import { api } from "~/lib/api-client";
import type { AuditLogEntry, AuditQuery } from "~/features/audit/types";

// Append only, so nothing here builds a row menu implying an update or a delete.
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
