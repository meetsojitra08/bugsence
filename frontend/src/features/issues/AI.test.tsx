import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { aiApi } from "./api/aiApi";
import { useAITriage, useFindDuplicates, useSummarizeIssue } from "./hooks/useAI";
import * as apiClient from "@/lib/apiClient";

describe("AI API Client and Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("aiApi Client", () => {
    it("calls /ai/triage/ with project_id and raw_text", async () => {
      const mockResult = {
        title: "Database connection timeout",
        type: "bug" as const,
        priority: "urgent" as const,
        severity: "critical" as const,
        steps_to_reproduce: ["Restart worker"],
        expected_behavior: "Clean close",
        actual_behavior: "Hangs indefinitely",
        suggested_labels: ["backend"],
        possible_root_cause: "Connection pool exhaustion",
        confidence: 0.95,
        reasoning: "Resource exhaustion in worker cluster",
      };

      const spy = vi.spyOn(apiClient, "apiRequest").mockResolvedValueOnce(mockResult);

      const result = await aiApi.triageIssue({
        projectId: "proj-123",
        rawText: "Postgres connection pool exhausted under load",
      });

      expect(spy).toHaveBeenCalledWith("/ai/triage/", {
        method: "POST",
        body: JSON.stringify({
          project_id: "proj-123",
          raw_text: "Postgres connection pool exhausted under load",
        }),
      });
      expect(result.title).toBe("Database connection timeout");
    });

    it("calls /ai/duplicates/ with threshold", async () => {
      const mockCandidates = [
        {
          id: "dup-1",
          number: 14,
          key: "BUG-14",
          title: "Connection pool timeout",
          status: "todo" as const,
          similarity: 0.89,
        },
      ];

      const spy = vi.spyOn(apiClient, "apiRequest").mockResolvedValueOnce(mockCandidates);

      const result = await aiApi.findDuplicates({
        projectId: "proj-123",
        title: "Connection pool timeouts",
        threshold: 0.85,
      });

      expect(spy).toHaveBeenCalledWith("/ai/duplicates/", {
        method: "POST",
        body: JSON.stringify({
          project_id: "proj-123",
          title: "Connection pool timeouts",
          description: "",
          threshold: 0.85,
        }),
      });
      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.89);
    });

    it("calls /issues/{id}/ai/summarize/ with regenerate option", async () => {
      const mockSummary = {
        tldr: "Issue summarized.",
        status: "In progress",
        open_questions: [],
        next_steps: ["Ship fix"],
        is_stale: false,
        generated_at: new Date().toISOString(),
      };

      const spy = vi.spyOn(apiClient, "apiRequest").mockResolvedValueOnce(mockSummary);

      const result = await aiApi.summarizeIssue({
        issueId: "issue-abc",
        regenerate: true,
      });

      expect(spy).toHaveBeenCalledWith("/issues/issue-abc/ai/summarize/", {
        method: "POST",
        body: JSON.stringify({ regenerate: true }),
      });
      expect(result.tldr).toBe("Issue summarized.");
    });
  });

  describe("useAITriage Hook", () => {
    it("executes mutation and returns structured triage result", async () => {
      const mockResult = {
        title: "Crash on drag",
        type: "bug" as const,
        priority: "high" as const,
        severity: "major" as const,
        steps_to_reproduce: ["Drag card"],
        expected_behavior: "Card moves",
        actual_behavior: "Card snaps back",
        suggested_labels: ["kanban"],
        possible_root_cause: "Position NaN calculation",
        confidence: 0.9,
        reasoning: "Midpoint calculation error",
      };

      vi.spyOn(aiApi, "triageIssue").mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAITriage(), { wrapper });

      result.current.mutate({ projectId: "proj-1", rawText: "Card snaps back when dragged" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.title).toBe("Crash on drag");
    });
  });

  describe("useFindDuplicates Hook", () => {
    it("does not query if title length is below minimum (< 10 chars)", () => {
      const spy = vi.spyOn(aiApi, "findDuplicates");

      const { result } = renderHook(
        () => useFindDuplicates("proj-1", "short", "", { debounceMs: 10 }),
        { wrapper },
      );

      expect(result.current.isLoading).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });

    it("queries when title exceeds minimum length after debounce", async () => {
      const mockDups = [
        {
          id: "dup-1",
          number: 1,
          key: "PROJ-1",
          title: "Search bar clears when typing fast",
          status: "todo" as const,
          similarity: 0.92,
        },
      ];

      vi.spyOn(aiApi, "findDuplicates").mockResolvedValueOnce(mockDups);

      const { result } = renderHook(
        () => useFindDuplicates("proj-1", "Search bar resets when typing quickly", "", { debounceMs: 10 }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].key).toBe("PROJ-1");
    });
  });

  describe("useSummarizeIssue Hook", () => {
    it("fetches cached summary and allows forced regeneration", async () => {
      const mockInitial = {
        tldr: "Initial summary",
        status: "Active",
        open_questions: [],
        next_steps: [],
        is_stale: false,
        generated_at: "2026-11-08T10:00:00Z",
      };
      const mockRegen = {
        tldr: "Regenerated summary",
        status: "Updated",
        open_questions: [],
        next_steps: [],
        is_stale: false,
        generated_at: "2026-11-08T11:00:00Z",
      };

      const spy = vi
        .spyOn(aiApi, "summarizeIssue")
        .mockResolvedValueOnce(mockInitial)
        .mockResolvedValueOnce(mockRegen);

      const { result } = renderHook(() => useSummarizeIssue("issue-123"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.tldr).toBe("Initial summary");

      // Trigger regenerate
      await result.current.regenerate();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenLastCalledWith({ issueId: "issue-123", regenerate: true });
    });
  });
});
