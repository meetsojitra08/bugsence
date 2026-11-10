import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IssuesPage } from "./pages/IssuesPage";
import { useProjectStore } from "@/stores/useProjectStore";
import { SafeMarkdown } from "./utils/markdown";
import * as projectsHook from "@/features/projects/hooks/useProjects";
import * as issuesHook from "./hooks/useIssues";
import type { IssueDetail, IssueListItem } from "./types";

const sampleIssues: IssueListItem[] = [
  {
    id: "iss-1",
    number: 1,
    key: "BUG-1",
    project_key: "BUG",
    title: "Checkout button unresponsive on Safari",
    status: "in_progress",
    priority: "urgent",
    severity: "critical",
    type: "bug",
    position: 0,
    reporter: { id: "u-1", email: "alex@bugsense.dev", full_name: "Alex" },
    assignee: { id: "u-1", email: "alex@bugsense.dev", full_name: "Alex" },
    labels: [{ id: "lbl-1", name: "Checkout", color: "#2563EB" }],
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "iss-4",
    number: 4,
    key: "BUG-4",
    project_key: "BUG",
    title: "Session expires cleanly after idle timeout",
    status: "done",
    priority: "medium",
    severity: "minor",
    type: "task",
    position: 1,
    reporter: { id: "u-1", email: "alex@bugsense.dev", full_name: "Alex" },
    assignee: null,
    labels: [],
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const detailIssue: IssueDetail = {
  ...sampleIssues[0],
  project_id: "project-1",
  project_name: "BugSense Core",
  description: "Clicking Pay does nothing in Safari 17.",
  steps_to_reproduce: "1. Open checkout\n2. Click Pay",
  expected: "Redirect to Stripe",
  actual: "No event fires",
  environment: "Safari 17",
  ai_summary: "",
  ai_metadata: {},
  duplicate_of_id: null,
  comments_count: 1,
};

function renderWithProviders(ui: React.ReactElement, initialEntry = "/issues") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("IssuesPage UI", () => {
  const mockBulkMutate = vi.fn();

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
      data: [
        {
          id: "m-1",
          user: { id: "u-1", email: "alex@bugsense.dev", full_name: "Alex" },
          role: "owner",
          created_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjectMembers>);

    vi.spyOn(issuesHook, "useIssues").mockReturnValue({
      data: {
        count: 2,
        total_pages: 1,
        current_page: 1,
        page_size: 25,
        results: sampleIssues,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof issuesHook.useIssues>);

    vi.spyOn(issuesHook, "useLabels").mockReturnValue({
      data: [{ id: "lbl-1", name: "Checkout", color: "#2563EB" }],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useLabels>);

    vi.spyOn(issuesHook, "useIssue").mockReturnValue({
      data: detailIssue,
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

    vi.spyOn(issuesHook, "useBulkIssueAction").mockReturnValue({
      mutate: mockBulkMutate,
      isPending: false,
    } as unknown as ReturnType<typeof issuesHook.useBulkIssueAction>);
  });

  it("renders saved views, search bar, updated columns, and hides pagination for <= 25 items", async () => {
    renderWithProviders(<IssuesPage />);

    expect(screen.getByTestId("issues-page")).toBeInTheDocument();
    expect(screen.getByTestId("saved-views-bar")).toBeInTheDocument();
    expect(screen.getByTestId("saved-view-all")).toBeInTheDocument();
    expect(screen.getByTestId("saved-view-unassigned")).toBeInTheDocument();
    expect(screen.getByTestId("saved-view-overdue")).toBeInTheDocument();
    expect(screen.getByTestId("saved-view-recently_closed")).toBeInTheDocument();

    expect(screen.getByTestId("issues-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("create-issue-btn")).toHaveTextContent("Capture");
    expect(screen.getByTestId("status-chip-inbox")).toBeInTheDocument();
    expect(screen.queryByTestId("overdue-filter-chip")).toBeNull();
    expect(screen.getByTestId("issues-sort-select")).toBeInTheDocument();
    expect(screen.getByTestId("issues-group-select")).toBeInTheDocument();
    expect(screen.getByTestId("issues-table")).toBeInTheDocument();
    expect(screen.getByText("BUG-1")).toBeInTheDocument();

    // Redesigned columns omit separate Labels and Actions headers
    expect(screen.queryByRole("columnheader", { name: /^labels$/i })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /^actions$/i })).toBeNull();
    expect(screen.queryByTestId("pagination-next")).toBeNull();
  });

  it("shows bulk action bar when selecting issues via checkboxes", async () => {
    renderWithProviders(<IssuesPage />);

    expect(screen.queryByTestId("bulk-action-bar")).toBeNull();
    fireEvent.click(screen.getByTestId("select-issue-1"));

    expect(screen.getByTestId("bulk-action-bar")).toHaveTextContent("1 issue selected");
    fireEvent.change(screen.getByLabelText("Bulk change status"), { target: { value: "done" } });

    expect(mockBulkMutate).toHaveBeenCalledWith(
      { action: "status", status: "done", issue_ids: ["iss-1"] },
      expect.any(Object)
    );
  });

  it("opens create issue modal when clicking capture button", async () => {
    renderWithProviders(<IssuesPage />);

    fireEvent.click(screen.getByTestId("create-issue-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("create-issue-form")).toBeInTheDocument();
      expect(screen.getByTestId("create-issue-title-input")).toBeInTheDocument();
    });
  });

  it("opens issue detail panel when clicking a table row and switches Details / Activity tabs", async () => {
    renderWithProviders(<IssuesPage />);

    fireEvent.click(screen.getByTestId("issue-row-1"));

    await waitFor(() => {
      expect(screen.getByTestId("issue-detail-panel")).toBeInTheDocument();
      expect(screen.getByTestId("panel-status-select")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tab-activity"));

    await waitFor(() => {
      expect(screen.getByTestId("activity-timeline")).toBeInTheDocument();
    });
  });

  it("groups issues in IssueTable when Group by Status is selected", () => {
    renderWithProviders(<IssuesPage />);
    fireEvent.change(screen.getByTestId("issues-group-select"), {
      target: { value: "status" },
    });
    expect(screen.getByTestId("issue-group-in_progress")).toHaveTextContent("In Progress (1)");
    expect(screen.getByTestId("issue-group-done")).toHaveTextContent("Done (1)");
  });
});

describe("SafeMarkdown Sanitization", () => {
  it("renders headings, code blocks and lists without unsafe script execution", () => {
    const rawContent = "# Title\n- Item 1\n`inline code`\n<script>alert('xss')</script>";
    const { container } = render(<SafeMarkdown content={rawContent} />);

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("Title");
    expect(container.textContent).toContain("inline code");
    expect(container.textContent).toContain("<script>alert('xss')</script>");
  });
});
