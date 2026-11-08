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

describe("AI UI Features", () => {
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
          project: "proj-1",
          user: { id: "u-1", email: "alice@example.com", full_name: "Alice Engineer" },
          role: "member",
          joined_at: new Date().toISOString(),
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

  describe("CreateIssueModal AI Triage and Duplicate Banner", () => {
    it("renders AI triage assistant and populates form fields upon auto-fill", async () => {
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
        reasoning: "Critical crash on empty boards",
      };

      vi.spyOn(aiApi, "triageIssue").mockResolvedValueOnce(mockTriageResult);

      renderWithProviders(
        <CreateIssueModal isOpen={true} onClose={() => {}} projectId="proj-1" />
      );

      // Verify AI triage card renders
      expect(screen.getByTestId("ai-triage-card")).toBeInTheDocument();
      expect(screen.getByText("AI Smart Triage")).toBeInTheDocument();

      const rawInput = screen.getByTestId("ai-triage-raw-input");
      fireEvent.change(rawInput, {
        target: {
          value:
            "Uncaught TypeError: Cannot read properties of undefined in KanbanColumn.tsx",
        },
      });

      const autoFillBtn = screen.getByTestId("ai-autofill-button");
      fireEvent.click(autoFillBtn);

      // Verify fields auto-fill
      await waitFor(() => {
        const titleInput = screen.getByTestId(
          "create-issue-title-input"
        ) as HTMLInputElement;
        expect(titleInput.value).toBe("Unhandled TypeError in KanbanColumn render");
      });

      const prioritySelect = screen.getByTestId(
        "create-issue-priority-select"
      ) as HTMLSelectElement;
      expect(prioritySelect.value).toBe("urgent");

      // Verify confidence chip
      expect(screen.getByTestId("ai-confidence-chip")).toHaveTextContent("95% confidence");

      // Verify root cause hint card
      expect(screen.getByTestId("ai-root-cause-hint")).toBeInTheDocument();
      expect(
        screen.getByText("Missing optional chaining on column items")
      ).toBeInTheDocument();

      // Test Undo button
      const undoBtn = screen.getByTestId("ai-undo-button");
      fireEvent.click(undoBtn);

      const titleAfterUndo = screen.getByTestId(
        "create-issue-title-input"
      ) as HTMLInputElement;
      expect(titleAfterUndo.value).toBe("");
    });

    it("displays duplicate warning banner when similar issues are detected", async () => {
      const mockDuplicates = [
        {
          id: "issue-dup-1",
          number: 5,
          key: "PROJ-5",
          title: "Kanban column crashes on empty data",
          status: "in_progress" as const,
          similarity: 0.88,
        },
      ];

      vi.spyOn(aiApi, "findDuplicates").mockResolvedValueOnce(mockDuplicates);

      renderWithProviders(
        <CreateIssueModal isOpen={true} onClose={() => {}} projectId="proj-1" />
      );

      const titleInput = screen.getByTestId("create-issue-title-input");
      fireEvent.change(titleInput, {
        target: { value: "Kanban column crash on empty items" },
      });

      // Banner should appear after debounced query
      expect(await screen.findByTestId("ai-duplicate-banner")).toBeInTheDocument();
      expect(screen.getByText("1 similar issue found")).toBeInTheDocument();

      // Expand duplicates list
      const toggleBtn = screen.getByTestId("ai-duplicate-toggle");
      fireEvent.click(toggleBtn);

      expect(await screen.findByTestId("duplicate-item-PROJ-5")).toBeInTheDocument();
      expect(screen.getByText("88% match")).toBeInTheDocument();
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

      // Verify card renders and loads async summary
      expect(await screen.findByText(/Root cause found in missing/)).toBeInTheDocument();
      expect(screen.getByText("Fix PR open and awaiting review")).toBeInTheDocument();
      expect(screen.getByText("• Merge PR #45")).toBeInTheDocument();
      expect(screen.getByText("• Should we backport to v1.2?")).toBeInTheDocument();

      // Toggle collapse
      const toggleBtn = screen.getByTestId("ai-summary-toggle");
      fireEvent.click(toggleBtn);

      // Content collapsed
      expect(
        screen.queryByText("Fix PR open and awaiting review")
      ).not.toBeInTheDocument();

      // Expand again
      fireEvent.click(toggleBtn);
      expect(
        screen.getByText("Fix PR open and awaiting review")
      ).toBeInTheDocument();
    });
  });
});
