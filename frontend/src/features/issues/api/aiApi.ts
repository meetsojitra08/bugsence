import { apiRequest } from "@/lib/apiClient";
import type { AIDuplicateCandidate, AISummaryResult, AITriageResult } from "../types";

export const aiApi = {
  triageIssue: async ({
    projectId,
    rawText,
  }: {
    projectId: string;
    rawText: string;
  }): Promise<AITriageResult> =>
    apiRequest<AITriageResult>("/ai/triage/", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, raw_text: rawText }),
      timeoutMs: 50_000,
    }),

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
  }): Promise<AIDuplicateCandidate[]> =>
    apiRequest<AIDuplicateCandidate[]>("/ai/duplicates/", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, title, description, threshold }),
      timeoutMs: 50_000,
    }),

  summarizeIssue: async ({
    issueId,
    regenerate = false,
  }: {
    issueId: string;
    regenerate?: boolean;
  }): Promise<AISummaryResult> =>
    apiRequest<AISummaryResult>(`/issues/${issueId}/ai/summarize/`, {
      method: "POST",
      body: JSON.stringify({ regenerate }),
      timeoutMs: 50_000,
    }),
};
