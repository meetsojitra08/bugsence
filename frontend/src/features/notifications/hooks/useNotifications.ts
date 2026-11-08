import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notificationsApi";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (unreadOnly: boolean) => ["notifications", "list", { unreadOnly }] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

export function useNotifications(unreadOnly: boolean = false) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(unreadOnly),
    queryFn: () => notificationsApi.list(unreadOnly),
    refetchInterval: 30_000,
  });
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}
