/**
 * Mirrors src/notifications. Payloads are already blindness safe, so the message renders
 * as given and is never enriched by fetching the project it mentions.
 */
export const NOTIFICATION_TYPES = [
  "marker_assigned",
  "deadline_approaching",
  "discrepancy_opened",
  "discrepancy_moved",
  "discrepancy_resolved",
  "password_reset",
  "account_created",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  subject: string;
  message: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
