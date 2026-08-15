/** Mirrors src/audit. Append only: there is no update route and no delete route. */
export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  offeringId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditQuery {
  action?: string;
  actor?: string;
  limit?: number;
}
