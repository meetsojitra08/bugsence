import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { IssueTimeline } from "./components/timeline/IssueTimeline";
import { CommentComposer } from "./components/timeline/CommentComposer";
import { CommentCard } from "./components/timeline/CommentCard";
import { issuesApi } from "./api/issuesApi";
import type { TimelineItem } from "./types";

// Mock auth context
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "current-user-id",
      email: "current@bugsense.dev",
      full_name: "Current User",
    },
  }),
}));

// Mock project members
vi.mock("@/features/projects/hooks/useProjects", () => ({
  useProjectMembers: () => ({
    data: [
      {
        id: "mem-1",
        user: {
          id: "current-user-id",
          email: "current@bugsense.dev",
          full_name: "Current User",
        },
        role: "owner",
      },
      {
        id: "mem-2",
        user: {
          id: "sarah-id",
          email: "sarah.chen@bugsense.dev",
          full_name: "Sarah Chen",
        },
        role: "member",
      },
    ],
  }),
}));

// Mock API client
vi.mock("./api/issuesApi", () => ({
  issuesApi: {
    getTimeline: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe("Comments and Activity Timeline UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTimelineData: TimelineItem[] = [
    {
      id: "act-1",
      type: "activity",
      actor: { id: "sarah-id", email: "sarah.chen@bugsense.dev", full_name: "Sarah Chen" },
      verb: "created",
      field: "",
      old_value: "",
      new_value: "Issue Title",
      body: "",
      is_edited: false,
      edited_at: null,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "comm-1",
      type: "comment",
      actor: { id: "current-user-id", email: "current@bugsense.dev", full_name: "Current User" },
      verb: "commented",
      field: "",
      old_value: "",
      new_value: "",
      body: "Working on reproducing this with **Playwright**.",
      is_edited: false,
      edited_at: null,
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ];

  it("renders chronological timeline stream with activities and comment cards", async () => {
    vi.mocked(issuesApi.getTimeline).mockResolvedValueOnce(mockTimelineData);

    const { wrapper } = createTestWrapper();
    render(
      <IssueTimeline issueId="issue-123" projectId="proj-456" projectKey="BUG" issueNumber={1} />,
      { wrapper }
    );

    // Wait for async timeline data to resolve
    expect(await screen.findByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("created this issue")).toBeInTheDocument();

    // Check comment card rendered with bold text from SafeMarkdown
    expect(screen.getByText("Current User")).toBeInTheDocument();
    expect(screen.getByText("Playwright")).toBeInTheDocument();
  });

  it("CommentComposer writes, previews Markdown and inserts @mentions", async () => {
    const mockSubmit = vi.fn().mockResolvedValueOnce({});

    const { wrapper } = createTestWrapper();
    render(<CommentComposer projectId="proj-456" onSubmit={mockSubmit} />, { wrapper });

    const textarea = screen.getByTestId("comment-composer-textarea");

    // Type comment with mention trigger
    fireEvent.change(textarea, { target: { value: "Hello @sar", selectionStart: 10 } });

    // Autocomplete dropdown appears
    await waitFor(() => {
      expect(screen.getByTestId("mention-autocomplete-menu")).toBeInTheDocument();
      expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    });

    // Click mention option to insert
    const mentionOption = screen.getByTestId("mention-option-sarah.chen@bugsense.dev");
    fireEvent.mouseDown(mentionOption);

    // Verify mention inserted
    expect(textarea).toHaveValue("Hello @sarah.chen ");

    // Switch to preview tab
    const previewTab = screen.getByTestId("composer-tab-preview");
    fireEvent.click(previewTab);

    expect(screen.getByTestId("comment-composer-preview")).toBeInTheDocument();
    expect(screen.getByText(/Hello @sarah.chen/)).toBeInTheDocument();

    // Switch back and submit
    const writeTab = screen.getByTestId("composer-tab-write");
    fireEvent.click(writeTab);

    const submitBtn = screen.getByTestId("submit-comment-btn");
    fireEvent.click(submitBtn);

    expect(mockSubmit).toHaveBeenCalledWith("Hello @sarah.chen");
  });

  it("CommentCard allows author to edit comment", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockDelete = vi.fn().mockResolvedValue({});

    const commentItem: TimelineItem = {
      id: "comm-editable",
      type: "comment",
      actor: { id: "current-user-id", email: "current@bugsense.dev", full_name: "Current User" },
      verb: "commented",
      field: "",
      old_value: "",
      new_value: "",
      body: "Initial text",
      is_edited: false,
      edited_at: null,
      created_at: new Date().toISOString(),
    };

    render(
      <CommentCard
        item={commentItem}
        currentUserId="current-user-id"
        isProjectAdminOrOwner={false}
        onUpdate={mockUpdate}
        onDelete={mockDelete}
      />
    );

    // Edit button is rendered for author
    const editBtn = screen.getByTestId("edit-comment-comm-editable");
    fireEvent.click(editBtn);

    const editArea = screen.getByTestId("edit-comment-textarea-comm-editable");
    fireEvent.change(editArea, { target: { value: "Edited comment text" } });

    const saveBtn = screen.getByTestId("save-comment-btn-comm-editable");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("comm-editable", "Edited comment text");
    });
  });

  it("CommentCard allows author to delete comment", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockDelete = vi.fn().mockResolvedValue({});

    const commentItem: TimelineItem = {
      id: "comm-deletable",
      type: "comment",
      actor: { id: "current-user-id", email: "current@bugsense.dev", full_name: "Current User" },
      verb: "commented",
      field: "",
      old_value: "",
      new_value: "",
      body: "To be deleted",
      is_edited: false,
      edited_at: null,
      created_at: new Date().toISOString(),
    };

    render(
      <CommentCard
        item={commentItem}
        currentUserId="current-user-id"
        isProjectAdminOrOwner={false}
        onUpdate={mockUpdate}
        onDelete={mockDelete}
      />
    );

    const deleteBtn = screen.getByTestId("delete-comment-comm-deletable");
    fireEvent.click(deleteBtn);

    expect(mockDelete).toHaveBeenCalledWith("comm-deletable");
  });
});
