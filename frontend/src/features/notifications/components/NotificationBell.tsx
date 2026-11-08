import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  UserCheck,
  AtSign,
  ArrowRightCircle,
} from "lucide-react";
import {
  useNotifications,
  useNotificationUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../hooks/useNotifications";
import type { NotificationItem, NotificationKind } from "../types";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useNotificationUnreadCount();
  const { data: notifications = [], isLoading } = useNotifications(unreadOnly);
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
    setIsOpen(false);
    if (item.issue) {
      navigate(`/p/${item.issue.project_key}/issues/${item.issue.number}`);
    }
  };

  const getKindIcon = (kind: NotificationKind) => {
    switch (kind) {
      case "assigned":
        return <UserCheck className="h-3.5 w-3.5 text-primary" />;
      case "mentioned":
        return <AtSign className="h-3.5 w-3.5 text-warning" />;
      case "status_changed":
        return <ArrowRightCircle className="h-3.5 w-3.5 text-success" />;
      case "comment_created":
      default:
        return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
        title="Notifications"
        aria-label="Notifications"
        data-testid="notification-bell-button"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-xs"
            data-testid="notification-unread-badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className="animate-in fade-in zoom-in-95 absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-surface-elevated text-text shadow-2xl duration-150 z-50 overflow-hidden"
          data-testid="notification-popover"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  className="flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-primary transition-colors"
                  data-testid="mark-all-read-btn"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border bg-surface/20 px-3 py-1.5 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setUnreadOnly(false)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                !unreadOnly
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
              data-testid="tab-all-notifications"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setUnreadOnly(true)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                unreadOnly
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
              data-testid="tab-unread-notifications"
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-text-muted">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                <Check className="mx-auto mb-2 h-6 w-6 text-success/60" />
                <p className="font-medium text-text">All caught up!</p>
                <p className="mt-1">No notifications to display.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`flex cursor-pointer items-start gap-3 p-3.5 transition-colors hover:bg-surface/80 ${
                    !item.is_read ? "bg-primary/5" : ""
                  }`}
                  data-testid={`notification-item-${item.id}`}
                >
                  {/* Kind Icon */}
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface border border-border">
                    {getKindIcon(item.kind)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-text">
                        {item.title}
                      </p>
                      <span className="flex-shrink-0 text-[10px] text-text-muted">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                      {item.message}
                    </p>

                    {item.issue && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-primary">
                        <span>{item.issue.key}</span>
                      </div>
                    )}
                  </div>

                  {/* Unread indicator */}
                  {!item.is_read && (
                    <span
                      className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary"
                      data-testid={`unread-dot-${item.id}`}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
