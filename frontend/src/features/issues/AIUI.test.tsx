import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import { CreateIssueModal } from "./components/CreateIssueModal";
import { AISummaryCard } from "./components/ai/AISummaryCard";
import { aiApi } from "./api/aiApi";
import * as issuesHooks from "./hooks/useIssues";
import * as projectsHooks from "@/features/projects/hooks/useProjects";

describe("AI UI Features & Capture Trust Guarantees", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.restoreAllMocks();

    vi.spyOn(projectsHooks, "useProjectMembers").mockReturnValue({
      data: [
        {
          id: "m-1",
          user: { id: "u-1", email: "alice@example.com", full_name: "Alice Engineer" },
          role: "member",
          created_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHooks.useProjectMembers>);

    vi.spyOn(issuesHooks, "useLabels").mockReturnValue({
      data: [
        { id: "lbl-1", name: "Frontend", color: "#6366F1", description: "UI bugs" },
        { id: "lbl-2", name: "Backend", color: "#10B981", description: "API bugs" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHooks.useLabels>);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{ui}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe("Capture Modal AI Triage, Trust Bugs, and Duplicate Banner", () => {
    it("auto-fills fields on high confidence without bare percentage or silent assignee selection", async () => {
      const mockTriageResult = {
        title: "Unhandled TypeError in KanbanColumn render",
        type: "bug" as const,
        priority: "urgent" as const,
        severity: "critical" as const,
        steps_to_reproduce: ["Open board with empty project", "Observe white screen"],
        expected_behavior: "Show empty column placeholders",
        actual_behavior: "Uncaught TypeError: Cannot read properties of undefined",
        suggested_labels: ["Frontend"],
        possible_root_cause: "Missing optional chaining on column items",
        confidence: 0.95,
        missing_info: [],
        suggested_assignee: {
          id: "u-1",
          full_name: "Alice Engineer",
          email: "alice@example.com",
          reason: "Resolved related UI crashes",
        },
        reasoning: "Critical crash on empty boards",
      };

      vi.spyOn(aiApi, "triageIssue").mockResolvedValueOnce(mockTriageResult);

      renderWithProviders(
        <CreateIssueModal isOpen={true} onClose={() => {}} projectId="proj-1" projectKey="BUG" />
      );

      const rawInput = screen.getByTestId("ai-triage-raw-input");
      fireEvent.change(rawInput, {
        target: {
          value: "Uncaught TypeError: Cannot read properties of undefined in KanbanColumn.tsx",
        },
      });

      const autoFillBtn = screen.getByTestId("ai-autofill-button");
      fireEvent.click(autoFillBtn);

      await waitFor(() => {
        const titleInput = screen.getByTestId("create-issue-title-input") as HTMLInputElement;
        expect(titleInput.value).toBe("Unhandled TypeError in KanbanColumn render");
      });

      const prioritySelect = screen.getByTestId("create-issue-priority-select") as HTMLSelectElement;
      expect(prioritySelect.value).toBe("urgent");

      // Never render bare percentage like "95% confidence"
      const confidenceChip = screen.getByTestId("ai-confidence-chip");
      expect(confidenceChip).toHaveTextContent("Fields auto-filled");
      expect(confidenceChip.textContent).not.toMatch(/\d+%/);

      // Suggested assignee shown as 1-click suggestion, never silently selected in dropdown
      const assigneeSelect = screen.getByTestId("create-issue-assignee-select") as HTMLSelectElement;
      expect(assigneeSelect.value).toBe("");
      fireEvent.click(screen.getByTestId("apply-suggested-assignee"));
      expect(assigneeSelect.value).toBe("u-1");

      // Root cause hint renders cleanly
      expect(screen.getByTestId("ai-root-cause-hint")).toBeInTheDocument();
      expect(screen.getByText("Missing optional chaining on column items")).toBeInTheDocument();

      // Undo restores empty draft
      fireEvent.click(screen.getByTestId("ai-undo-button"));
      const titleAfterUndo = screen.getByTestId("create-issue-title-input") as HTMLInputElement;
      expect(titleAfterUndo.value).toBe("");
    });

    it("leaves priority blank and explains missing context when confidence is below 0.6", async () => {
      vi.spyOn(aiApi, "triageIssue").mockResolvedValueOnce({
        title: "Login seems broken",
        type: "bug",
        priority: "high",
        severity: "major",
        steps_to_reproduce: [],
        expected_behavior: "",
        actual_behavior: "",
        suggested_labels: [],
        possible_root_cause: "",
        confidence: 0.42,
        missing_info: ["browser version", "error message"],
        suggested_assignee: null,
        reasoning: "Short vague description",
      });

      renderWithProviders(
        <CreateIssueModal isOpen={true} onClose={() => {}} projectId="proj-1" projectKey="BUG" />
      );

      fireEvent.change(screen.getByTestId("ai-triage-raw-input"), {
        target: { value: "Login broken please check" },
      });
      fireEvent.click(screen.getByTestId("ai-autofill-button"));

      await waitFor(() => {
        expect(screen.getByTestId("ai-confidence-chip")).toHaveTextContent("Needs more context:");
      });

      expect(screen.getByTestId("ai-confidence-chip")).toHaveTextContent(
        "Add the browser version and error message to improve this."
      );

      const prioritySelect = screen.getByTestId("create-issue-priority-select") as HTMLSelectElement;
      expect(prioritySelect.value).toBe("");
      expect(screen.getByTestId("priority-low-confidence-nudge")).toHaveTextContent(
        "Pick priority (defaults to Medium)"
      );
    });

    it("displays inline duplicate warning banner when similar issues are detected", async () => {
      const mockDuplicates = [
        {
          id: "issue-dup-1",
          number: 5,
          key: "PROJ-5",
          title: "Kanban column crashes on empty data",
          status: "in_progress" as const,
          similarity: 0.88,
        },
        {
          id: "issue-dup-2",
          number: 9,
          key: "PROJ-9",
          title: "Column undefined on reload",
          status: "todo" as const,
          similarity: 0.76,
        },
      ];

      vi.spyOn(aiApi, "findDuplicates").mockResolvedValueOnce(mockDuplicates);

      renderWithProviders(
        <CreateIssueModal isOpen={true} onClose={() => {}} projectId="proj-1" projectKey="PROJ" />
      );

      fireEvent.change(screen.getByTestId("create-issue-title-input"), {
        target: { value: "Kanban column crash on empty items" },
      });

      const banner = await screen.findByTestId("ai-duplicate-banner");
      expect(banner).toHaveTextContent("Looks similar to PROJ-5 (88%)");
      expect(banner).toHaveTextContent("2 similar issues found");

      fireEvent.click(screen.getByTestId("ai-duplicate-toggle"));
      expect(await screen.findByTestId("duplicate-item-PROJ-5")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("duplicate-link-btn"));
      expect(banner).toHaveTextContent("Linked as duplicate of PROJ-5");
    });
  });

  describe("AISummaryCard", () => {
    it("renders AI summary card with TL;DR, status, next steps and handles collapse", async () => {
      const mockSummary = {
        tldr: "Root cause found in missing database connection pool cleanup on worker SIGTERM.",
        status: "Fix PR open and awaiting review",
        open_questions: ["Should we backport to v1.2?"],
        next_steps: ["Merge PR #45", "Verify in staging cluster"],
        is_stale: false,
        generated_at: new Date().toISOString(),
      };

      vi.spyOn(aiApi, "summarizeIssue").mockResolvedValueOnce(mockSummary);

      renderWithProviders(
        <AISummaryCard issueId="issue-123" initialSummary="Initial fallback summary" />
      );

      expect(await screen.findByText(/Root cause found in missing/)).toBeInTheDocument();
      expect(screen.getByText("Fix PR open and awaiting review")).toBeInTheDocument();
      expect(screen.getByText("• Merge PR #45")).toBeInTheDocument();
      expect(screen.getByText("• Should we backport to v1.2?")).toBeInTheDocument();

      const toggleBtn = screen.getByTestId("ai-summary-toggle");
      fireEvent.click(toggleBtn);
      expect(screen.queryByText("Fix PR open and awaiting review")).not.toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(screen.getByText("Fix PR open and awaiting review")).toBeInTheDocument();
    });
  });
});
