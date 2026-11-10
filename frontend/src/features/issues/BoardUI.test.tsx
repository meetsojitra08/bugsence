import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BoardPage } from "./pages/BoardPage";
import { useProjectStore } from "@/stores/useProjectStore";
import * as projectsHook from "@/features/projects/hooks/useProjects";
import * as issuesHook from "./hooks/useIssues";
import type { IssueDetail, IssueListItem } from "./types";

const bug1: IssueListItem = {
  id: "iss-1",
  number: 1,
  key: "BUG-1",
  project_key: "BUG",
  title: "Drag card snap regression",
  status: "in_progress",
  priority: "high",
  severity: "major",
  type: "bug",
  position: 0,
  reporter: { id: "u-1", email: "alex@bugsense.dev", full_name: "Alex" },
  assignee: { id: "u-1", email: "alex@bugsense.dev", full_name: "Alex" },
  labels: [],
  due_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const bugBacklog: IssueListItem = {
  ...bug1,
  id: "iss-5",
  number: 5,
  key: "BUG-5",
  title: "Backlog cleanup task",
  status: "backlog",
};

const detailBug1: IssueDetail = {
  ...bug1,
  project_id: "project-1",
  project_name: "BugSense Core",
  description: "Card jumps back on release.",
  steps_to_reproduce: "",
  expected: "",
  actual: "",
  environment: "",
  ai_summary: "",
  ai_metadata: {},
  duplicate_of_id: null,
  comments_count: 0,
};

function renderWithProviders(ui: React.ReactElement, initialEntry = "/board") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BoardPage UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useProjectStore.getState().setCurrentProjectId("project-1");

    vi.spyOn(projectsHook, "useProjects").mockReturnValue({
      data: [
        {
          id: "project-1",
          name: "BugSense Core",
          key: "BUG",
          description: "",
          owner_id: "u-1",
          archived: false,
          members_count: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjects>);

    vi.spyOn(projectsHook, "useProjectMembers").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjectMembers>);

    vi.spyOn(issuesHook, "useLabels").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useLabels>);

    vi.spyOn(issuesHook, "useBoard").mockReturnValue({
      data: {
        columns: {
          inbox: [],
          backlog: [bugBacklog],
          todo: [],
          in_progress: [bug1],
          in_review: [],
          done: [],
          closed: [],
        },
        counts: {
          inbox: 0,
          backlog: 1,
          todo: 0,
          in_progress: 1,
          in_review: 0,
          done: 0,
          closed: 0,
        },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useBoard>);

    vi.spyOn(issuesHook, "useIssue").mockReturnValue({
      data: detailBug1,
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useIssue>);

    vi.spyOn(issuesHook, "useIssueActivities").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useIssueActivities>);

    vi.spyOn(issuesHook, "useIssueTimeline").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useIssueTimeline>);
  });

  it("renders 4 default columns (Todo, In Progress, In Review, Done) and hides Backlog/Closed until toggled", () => {
    renderWithProviders(<BoardPage />);

    expect(screen.getByTestId("board-page")).toBeInTheDocument();
    expect(screen.getByTestId("board-view-active")).toBeInTheDocument();
    expect(screen.getByTestId("switch-to-list-view")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-board")).toBeInTheDocument();

    expect(screen.getByTestId("kanban-column-todo")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-in_progress")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-in_review")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-done")).toBeInTheDocument();
    expect(screen.queryByTestId("kanban-column-backlog")).toBeNull();
    expect(screen.queryByTestId("kanban-column-closed")).toBeNull();

    // Toggle Backlog column visible
    fireEvent.click(screen.getByRole("button", { name: /^backlog$/i }));
    expect(screen.getByTestId("kanban-column-backlog")).toBeInTheDocument();
  });

  it("renders cards within their respective status columns", () => {
    renderWithProviders(<BoardPage />);

    expect(screen.getByTestId("kanban-card-BUG-1")).toBeInTheDocument();
    const inProgressCol = screen.getByTestId("kanban-column-in_progress");
    expect(inProgressCol.textContent).toContain("BUG-1");
  });

  it("opens issue detail panel when a kanban card is clicked", async () => {
    renderWithProviders(<BoardPage />);

    fireEvent.click(screen.getByTestId("kanban-card-BUG-1"));

    await waitFor(() => {
      expect(screen.getByTestId("issue-detail-panel")).toBeInTheDocument();
      expect(screen.getByTestId("panel-status-select")).toBeInTheDocument();
    });
  });

  it("renders quick add button and form at bottom of column", () => {
    renderWithProviders(<BoardPage />);

    fireEvent.click(screen.getByTestId("quick-add-btn-todo"));
    expect(screen.getByTestId("quick-add-form-todo")).toBeInTheDocument();
    expect(screen.getByTestId("quick-add-input-todo")).toBeInTheDocument();
  });
});
