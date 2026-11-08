import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { notificationsApi } from "./api/notificationsApi";
import { NotificationBell } from "./components/NotificationBell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import * as notificationsHook from "./hooks/useNotifications";
import * as searchApiModule from "@/features/projects/api/searchApi";
import { useUiStore } from "@/stores/useUiStore";
import type { NotificationItem } from "./types";

const mockNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    kind: "assigned",
    title: "New issue assigned to you",
    message: "Sarah Chen assigned you to BUG-10.",
    actor: {
      id: "u-1",
      email: "sarah@bugsense.dev",
      full_name: "Sarah Chen",
    },
    issue: {
      id: "issue-10",
      number: 10,
      key: "BUG-10",
      title: "Fix crash on login",
      project_key: "BUG",
      status: "in_progress",
    },
    comment_id: null,
    read_at: null,
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "notif-2",
    kind: "mentioned",
    title: "You were mentioned in a comment",
    message: "Marcus Vance mentioned you on BUG-11.",
    actor: {
      id: "u-2",
      email: "marcus@bugsense.dev",
      full_name: "Marcus Vance",
    },
    issue: {
      id: "issue-11",
      number: 11,
      key: "BUG-11",
      title: "Add dark mode toggle",
      project_key: "BUG",
      status: "todo",
    },
    comment_id: "c-1",
    read_at: new Date().toISOString(),
    is_read: true,
    created_at: new Date().toISOString(),
  },
];

describe("Notifications API Client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns demo notifications and correct unread count in demo mode", async () => {
    localStorage.setItem("bugsense_demo_mode", "true");
    const count = await notificationsApi.getUnreadCount();
    expect(count).toBeGreaterThan(0);

    const list = await notificationsApi.list(false);
    expect(list.length).toBeGreaterThan(0);

    const unreadList = await notificationsApi.list(true);
    expect(unreadList.every((n) => !n.is_read)).toBe(true);
  });

  it("marks a notification read and marks all read in demo mode", async () => {
    localStorage.setItem("bugsense_demo_mode", "true");
    const list = await notificationsApi.list(true);
    const firstUnread = list[0];

    if (firstUnread) {
      const updated = await notificationsApi.markAsRead(firstUnread.id);
      expect(updated.is_read).toBe(true);
    }

    const res = await notificationsApi.markAllAsRead();
    expect(res).toHaveProperty("marked_read");
    const remainingUnread = await notificationsApi.getUnreadCount();
    expect(remainingUnread).toBe(0);
  });
});

describe("NotificationBell UI Component", () => {
  let queryClient: QueryClient;
  const mockMarkRead = vi.fn();
  const mockMarkAllRead = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    vi.spyOn(notificationsHook, "useNotificationUnreadCount").mockReturnValue({
      data: 1,
      isLoading: false,
    } as unknown as ReturnType<typeof notificationsHook.useNotificationUnreadCount>);

    vi.spyOn(notificationsHook, "useNotifications").mockReturnValue({
      data: mockNotifications,
      isLoading: false,
    } as unknown as ReturnType<typeof notificationsHook.useNotifications>);

    vi.spyOn(notificationsHook, "useMarkNotificationRead").mockReturnValue({
      mutate: mockMarkRead,
    } as unknown as ReturnType<typeof notificationsHook.useMarkNotificationRead>);

    vi.spyOn(notificationsHook, "useMarkAllNotificationsRead").mockReturnValue({
      mutate: mockMarkAllRead,
    } as unknown as ReturnType<typeof notificationsHook.useMarkAllNotificationsRead>);
  });

  const renderBell = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <NotificationBell />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders bell button and unread count badge", () => {
    renderBell();
    expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument();
    expect(screen.getByTestId("notification-unread-badge")).toHaveTextContent("1");
  });

  it("toggles popover and displays notification items", () => {
    renderBell();
    const bellBtn = screen.getByTestId("notification-bell-button");
    fireEvent.click(bellBtn);

    expect(screen.getByTestId("notification-popover")).toBeInTheDocument();
    expect(screen.getByText("New issue assigned to you")).toBeInTheDocument();
    expect(screen.getByText("You were mentioned in a comment")).toBeInTheDocument();
    expect(screen.getByTestId("unread-dot-notif-1")).toBeInTheDocument();
  });

  it("triggers mark read mutation when clicking an unread notification", () => {
    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell-button"));

    const item = screen.getByTestId("notification-item-notif-1");
    fireEvent.click(item);

    expect(mockMarkRead).toHaveBeenCalledWith("notif-1");
  });

  it("triggers mark all read mutation when clicking mark all read button", () => {
    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell-button"));

    const markAllBtn = screen.getByTestId("mark-all-read-btn");
    fireEvent.click(markAllBtn);

    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it("renders empty state when no notifications exist", () => {
    vi.spyOn(notificationsHook, "useNotifications").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof notificationsHook.useNotifications>);

    renderBell();
    fireEvent.click(screen.getByTestId("notification-bell-button"));

    expect(screen.getByText("All caught up!")).toBeInTheDocument();
  });
});

describe("CommandPalette Global Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ isCommandPaletteOpen: true });
  });

  it("searches and renders grouped results for issues, projects and people", async () => {
    const mockSearchResponse = {
      issues: [
        {
          id: "issue-1",
          number: 1,
          key: "BUG-1",
          title: "Fix memory leak in websocket",
          status: "in_progress",
          priority: "urgent",
          project_key: "BUG",
        },
      ],
      projects: [
        {
          id: "proj-1",
          name: "BugSense Core",
          key: "BUG",
          description: "Core tracker",
        },
      ],
      people: [
        {
          id: "user-1",
          full_name: "Elena Rostova",
          email: "elena@bugsense.dev",
        },
      ],
    };

    vi.spyOn(searchApiModule.searchApi, "search").mockResolvedValue(mockSearchResponse);

    render(
      <BrowserRouter>
        <CommandPalette />
      </BrowserRouter>
    );

    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "BUG" } });

    await waitFor(() => {
      expect(screen.getByTestId("search-results-issues")).toBeInTheDocument();
      expect(screen.getByText("Fix memory leak in websocket")).toBeInTheDocument();
      expect(screen.getByTestId("search-results-projects")).toBeInTheDocument();
      expect(screen.getByText("BugSense Core")).toBeInTheDocument();
      expect(screen.getByTestId("search-results-people")).toBeInTheDocument();
      expect(screen.getByText("Elena Rostova")).toBeInTheDocument();
    });
  });

  it("closes palette on backdrop click", () => {
    render(
      <BrowserRouter>
        <CommandPalette />
      </BrowserRouter>
    );

    const backdrop = screen.getByTestId("command-palette-backdrop");
    fireEvent.click(backdrop);

    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);
  });
});
