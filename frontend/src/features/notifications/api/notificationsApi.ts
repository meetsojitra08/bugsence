import { apiRequest } from "@/lib/apiClient";
import type { NotificationItem, NotificationUnreadCountResponse } from "../types";

export const notificationsApi = {
  async list(unreadOnly: boolean = false): Promise<NotificationItem[]> {
    const params = unreadOnly ? { unread: "true" } : {};
    const data = await apiRequest<NotificationItem[] | { results: NotificationItem[] }>(
      "/notifications/",
      { params }
    );
    return Array.isArray(data) ? data : (data.results ?? []);
  },

  async getUnreadCount(): Promise<number> {
    const result = await apiRequest<NotificationUnreadCountResponse>("/notifications/unread-count/");
    return result.count;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    return apiRequest<NotificationItem>(`/notifications/${id}/read/`, { method: "POST" });
  },

  async markAllAsRead(): Promise<{ marked_read: number }> {
    return apiRequest<{ marked_read: number }>("/notifications/mark-all-read/", {
      method: "POST",
    });
  },
};
