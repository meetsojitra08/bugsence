import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { extractMentions, useIssueTimeline, useCreateComment, ISSUE_KEYS } from "./hooks/useIssues";
import { issuesApi } from "./api/issuesApi";
import type { TimelineItem } from "./types";

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

describe("Comments & Timeline Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractMentions helper", () => {
    it("extracts single and multiple mentions from text", () => {
      const text = "Hey @alex and @priya.sharma, please review this issue!";
      expect(extractMentions(text)).toEqual(["alex", "priya.sharma"]);
    });

    it("strips trailing punctuation like commas, dots, and exclamations", () => {
      const text = "Pinging @charlie, @dave! Also @eve.";
      expect(extractMentions(text)).toEqual(["charlie", "dave", "eve"]);
    });

    it("deduplicates identical mentions", () => {
      const text = "Calling @sarah once, and @sarah twice.";
      expect(extractMentions(text)).toEqual(["sarah"]);
    });

    it("returns empty array when text has no mentions", () => {
      const text = "Just a regular comment without any tags.";
      expect(extractMentions(text)).toEqual([]);
    });
  });

  describe("useIssueTimeline hook", () => {
    it("fetches and returns chronological timeline entries", async () => {
      const mockTimeline: TimelineItem[] = [
        {
          id: "act-1",
          type: "activity",
          actor: { id: "u1", email: "user1@bugsense.dev", full_name: "User One" },
          verb: "created",
          field: "",
          old_value: "",
          new_value: "Title",
          body: "",
          is_edited: false,
          edited_at: null,
          created_at: "2026-11-09T01:00:00Z",
        },
        {
          id: "comm-1",
          type: "comment",
          actor: { id: "u2", email: "user2@bugsense.dev", full_name: "User Two" },
          verb: "commented",
          field: "",
          old_value: "",
          new_value: "",
          body: "Initial observation",
          is_edited: false,
          edited_at: null,
          created_at: "2026-11-09T01:05:00Z",
        },
      ];

      vi.mocked(issuesApi.getTimeline).mockResolvedValueOnce(mockTimeline);

      const { wrapper } = createTestWrapper();
      const { result } = renderHook(() => useIssueTimeline("issue-123"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].verb).toBe("created");
      expect(result.current.data?.[1].type).toBe("comment");
      expect(result.current.data?.[1].body).toBe("Initial observation");
    });
  });

  describe("useCreateComment optimistic update", () => {
    it("optimistically adds comment to timeline and handles API failure rollback", async () => {
      const { queryClient, wrapper } = createTestWrapper();

      const initialTimeline: TimelineItem[] = [
        {
          id: "act-1",
          type: "activity",
          actor: { id: "u1", email: "user1@bugsense.dev", full_name: "User One" },
          verb: "created",
          field: "",
          old_value: "",
          new_value: "Title",
          body: "",
          is_edited: false,
          edited_at: null,
          created_at: "2026-11-09T01:00:00Z",
        },
      ];

      queryClient.setQueryData(ISSUE_KEYS.timeline("issue-123"), initialTimeline);

      // Simulate API rejection
      vi.mocked(issuesApi.createComment).mockRejectedValueOnce(new Error("Network Error"));

      const { result } = renderHook(() => useCreateComment("issue-123"), { wrapper });

      try {
        await result.current.mutateAsync({ body: "This will fail" });
      } catch {
        // Expected rejection
      }

      // Verify rollback after error
      await waitFor(() => {
        const cached = queryClient.getQueryData<TimelineItem[]>(ISSUE_KEYS.timeline("issue-123"));
        expect(cached).toHaveLength(1);
        expect(cached?.[0].id).toBe("act-1");
      });
    });
  });
});
