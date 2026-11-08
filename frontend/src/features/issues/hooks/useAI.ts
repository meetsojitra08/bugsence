import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../api/aiApi";
import type { AIDuplicateCandidate, AISummaryResult, AITriageResult } from "../types";

export const useAITriage = () => {
  return useMutation<AITriageResult, Error, { projectId: string; rawText: string }>({
    mutationFn: ({ projectId, rawText }) => aiApi.triageIssue({ projectId, rawText }),
  });
};

export const useFindDuplicates = (
  projectId: string,
  title: string,
  description: string = "",
  options: { enabled?: boolean; debounceMs?: number; threshold?: number } = {},
) => {
  const { enabled = true, debounceMs = 800, threshold = 0.8 } = options;
  const [debouncedTitle, setDebouncedTitle] = useState(title);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTitle(title);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [title, debounceMs]);

  const canQuery =
    enabled &&
    Boolean(projectId) &&
    debouncedTitle.trim().length >= 10;

  return useQuery<AIDuplicateCandidate[], Error>({
    queryKey: ["issues", "duplicates", projectId, debouncedTitle.trim(), threshold],
    queryFn: () =>
      aiApi.findDuplicates({
        projectId,
        title: debouncedTitle.trim(),
        description,
        threshold,
      }),
    enabled: canQuery,
    staleTime: 60 * 1000,
  });
};

export const useSummarizeIssue = (issueId: string) => {
  const queryClient = useQueryClient();

  const summaryQuery = useQuery<AISummaryResult, Error>({
    queryKey: ["issue", issueId, "summary"],
    queryFn: () => aiApi.summarizeIssue({ issueId, regenerate: false }),
    enabled: Boolean(issueId),
    staleTime: 5 * 60 * 1000,
  });

  const regenerateMutation = useMutation<AISummaryResult, Error>({
    mutationFn: () => aiApi.summarizeIssue({ issueId, regenerate: true }),
    onSuccess: (newSummary) => {
      queryClient.setQueryData(["issue", issueId, "summary"], newSummary);
    },
  });

  return {
    ...summaryQuery,
    regenerate: regenerateMutation.mutateAsync,
    isRegenerating: regenerateMutation.isPending,
  };
};
