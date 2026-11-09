import { apiRequest } from "@/lib/apiClient";
import { isDemoSession } from "@/lib/demo";
import type { AIDuplicateCandidate, AISummaryResult, AITriageResult } from "../types";

const getDemoTriageResult = (rawText: string): AITriageResult => {
  const lower = rawText.toLowerCase();
  const isCrashOrError =
    lower.includes("error") ||
    lower.includes("crash") ||
    lower.includes("null") ||
    lower.includes("exception") ||
    lower.includes("failed");

  return {
    title: isCrashOrError
      ? rawText.slice(0, 70).replace(/\n/g, " ").trim() || "Unhandled runtime exception"
      : rawText.slice(0, 70).trim() || "New feature or enhancement request",
    type: isCrashOrError ? "bug" : lower.includes("export") || lower.includes("add") ? "feature" : "task",
    priority: isCrashOrError ? "high" : "medium",
    severity: isCrashOrError ? "major" : "minor",
    steps_to_reproduce: [
      "Open the application dashboard in your browser.",
      "Trigger the action described in the report.",
      "Observe the unexpected error behavior.",
    ],
    expected_behavior: "Operation should complete cleanly without errors.",
    actual_behavior: rawText.slice(0, 150) || "Operation failed unexpectedly.",
    suggested_labels: isCrashOrError ? ["frontend", "bug"] : ["enhancement"],
    possible_root_cause: isCrashOrError
      ? "State boundary missing null check or unhandled API promise rejection."
      : "Feature enhancement not yet implemented.",
    confidence: 0.92,
    reasoning: isCrashOrError
      ? "Stack trace indicates unhandled runtime exception affecting active user sessions."
      : "Classified as feature enhancement based on user request keywords.",
  };
};

const getDemoDuplicates = (title: string): AIDuplicateCandidate[] => {
  const lower = title.toLowerCase();
  if (lower.includes("token") || lower.includes("auth") || lower.includes("login")) {
    return [
      {
        id: "demo-issue-1",
        number: 1,
        key: "BUG-1",
        title: "Silent token rotation failure on cross-tab session expiry",
        status: "in_progress",
        similarity: 0.88,
      },
    ];
  }
  if (lower.includes("crash") || lower.includes("null") || lower.includes("render")) {
    return [
      {
        id: "demo-issue-2",
        number: 2,
        key: "BUG-2",
        title: "Kanban board card drag tilt flicker on touch devices",
        status: "todo",
        similarity: 0.82,
      },
    ];
  }
  return [];
};

export const aiApi = {
  triageIssue: async ({
    projectId,
    rawText,
  }: {
    projectId: string;
    rawText: string;
  }): Promise<AITriageResult> => {
    if (isDemoSession()) {
      await new Promise((res) => setTimeout(res, 600));
      return getDemoTriageResult(rawText);
    }
    return apiRequest<AITriageResult>("/ai/triage/", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, raw_text: rawText }),
    });
  },

  findDuplicates: async ({
    projectId,
    title,
    description = "",
    threshold = 0.8,
  }: {
    projectId: string;
    title: string;
    description?: string;
    threshold?: number;
  }): Promise<AIDuplicateCandidate[]> => {
    if (isDemoSession()) {
      await new Promise((res) => setTimeout(res, 300));
      return getDemoDuplicates(title);
    }
    return apiRequest<AIDuplicateCandidate[]>("/ai/duplicates/", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        title,
        description,
        threshold,
      }),
    });
  },

  summarizeIssue: async ({
    issueId,
    regenerate = false,
  }: {
    issueId: string;
    regenerate?: boolean;
  }): Promise<AISummaryResult> => {
    if (isDemoSession()) {
      await new Promise((res) => setTimeout(res, 500));
      return {
        tldr: "Race condition in refresh token rotation across multi-tab clients causing unexpected 401 logouts.",
        status: "Root cause reproduced; active fix in progress by Sarah Chen.",
        open_questions: ["Should we implement BroadcastChannel for tab coordination?"],
        next_steps: [
          "Complete mutex lock in axios response interceptor",
          "Add e2e test with multiple browser contexts",
        ],
        is_stale: false,
        generated_at: new Date().toISOString(),
      };
    }
    return apiRequest<AISummaryResult>(`/issues/${issueId}/ai/summarize/`, {
      method: "POST",
      body: JSON.stringify({ regenerate }),
    });
  },
};
