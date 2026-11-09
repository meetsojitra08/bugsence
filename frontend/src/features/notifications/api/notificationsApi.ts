import { apiRequest } from "@/lib/apiClient";
import { isDemoSession } from "@/lib/demo";
import type { NotificationItem, NotificationUnreadCountResponse } from "../types";

let DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    kind: "assigned",
    title: "New issue assigned to you",
    message: "Sarah Chen assigned you to BUG-1: Fix authentication token refresh race condition.",
    actor: {
      id: "sarah-user-id",
      email: "sarah.chen@bugsense.dev",
      full_name: "Sarah Chen",
    },
    issue: {
      id: "issue-1",
      number: 1,
      key: "BUG-1",
      title: "Fix authentication token refresh race condition",
      project_key: "BUG",
      status: "in_progress",
    },
    comment_id: null,
    read_at: null,
    is_read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-2",
    kind: "mentioned",
    title: "You were mentioned in a comment",
    message: "Marcus Vance mentioned you on BUG-2: @Demo Recruiter please verify the CORS headers.",
    actor: {
      id: "marcus-user-id",
      email: "marcus.vance@bugsense.dev",
      full_name: "Marcus Vance",
    },
    issue: {
      id: "issue-2",
      number: 2,
      key: "BUG-2",
      title: "CORS configuration on staging",
      project_key: "BUG",
      status: "in_review",
    },
    comment_id: "comment-1",
    read_at: null,
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "notif-3",
    kind: "status_changed",
    title: "Issue status updated",
    message: "Sarah Chen moved BUG-3 from In Review to Done.",
    actor: {
      id: "sarah-user-id",
      email: "sarah.chen@bugsense.dev",
      full_name: "Sarah Chen",
    },
    issue: {
      id: "issue-3",
      number: 3,
      key: "BUG-3",
      title: "Implement drag and drop Kanban columns",
      project_key: "BUG",
      status: "done",
    },
    comment_id: null,
    read_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    is_read: true,
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
  },
];

export const notificationsApi = {
  async list(unreadOnly: boolean = false): Promise<NotificationItem[]> {
    if (isDemoSession()) {
      if (unreadOnly) {
        return DEMO_NOTIFICATIONS.filter((n) => !n.is_read);
      }
      return DEMO_NOTIFICATIONS;
    }

    const params: Record<string, string> = {};
    if (unreadOnly) {
      params.unread = "true";
    }

    // The API paginates this endpoint; tolerate both shapes so a paginator change
    // can never crash the notification bell again.
    const data = await apiRequest<
      NotificationItem[] | { results: NotificationItem[] }
    >("/notifications/", { params });

    return Array.isArray(data) ? data : (data.results ?? []);
  },

  async getUnreadCount(): Promise<number> {
    if (isDemoSession()) {
      return DEMO_NOTIFICATIONS.filter((n) => !n.is_read).length;
    }

    const res = await apiRequest<NotificationUnreadCountResponse>(
      "/notifications/unread-count/"
    );
    return res.count;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    if (isDemoSession()) {
      DEMO_NOTIFICATIONS = DEMO_NOTIFICATIONS.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      );
      const found = DEMO_NOTIFICATIONS.find((n) => n.id === id);
      if (!found) throw new Error("Notification not found");
      return found;
    }

    return apiRequest<NotificationItem>(`/notifications/${id}/read/`, {
      method: "POST",
    });
  },

  async markAllAsRead(): Promise<{ marked_read?: number; marked_read_count?: number }> {
    if (isDemoSession()) {
      const unreadCount = DEMO_NOTIFICATIONS.filter((n) => !n.is_read).length;
      DEMO_NOTIFICATIONS = DEMO_NOTIFICATIONS.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }));
      return { marked_read: unreadCount };
    }

    return apiRequest<{ marked_read: number }>("/notifications/mark-all-read/", {
      method: "POST",
    });
  },
};
