import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type { Notification } from "~/features/notifications/types";

/** The caller's own notifications. Payloads are already blindness safe, so nothing is enriched. */
export const notificationsService = {
  list(unreadOnly = false): Promise<Notification[]> {
    return api.get<Notification[]>("/me/notifications", {
      params: unreadOnly ? { unread: "true" } : undefined,
    });
  },

  markRead(id: string): Promise<ApiResult<Notification>> {
    return apiWithMessage.post<Notification>(`/me/notifications/${id}/read`);
  },
};
