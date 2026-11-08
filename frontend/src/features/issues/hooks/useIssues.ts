import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { issuesApi } from "../api/issuesApi";
import type { CreateIssuePayload, IssueFilters, UpdateIssuePayload } from "../types";

export const ISSUE_KEYS = {
  all: ["issues"] as const,
  list: (projectId: string | null, filters?: IssueFilters) =>
    ["issues", "list", projectId, filters] as const,
  detail: (issueId: string | null) => ["issues", "detail", issueId] as const,
  byNumber: (projectKeyOrId: string | null, number: number | null) =>
    ["issues", "byNumber", projectKeyOrId, number] as const,
  labels: (projectId: string | null) => ["issues", "labels", projectId] as const,
  activities: (issueId: string | null) => ["issues", "activities", issueId] as const,
};

export function useIssues(projectId: string | null, filters?: IssueFilters) {
  return useQuery({
    queryKey: ISSUE_KEYS.list(projectId, filters),
    queryFn: () =>
      projectId
        ? issuesApi.list(projectId, filters)
        : Promise.reject(new Error("No active project ID")),
    enabled: Boolean(projectId),
  });
}

export function useIssue(issueId: string | null) {
  return useQuery({
    queryKey: ISSUE_KEYS.detail(issueId),
    queryFn: () => (issueId ? issuesApi.get(issueId) : Promise.reject(new Error("No issue ID"))),
    enabled: Boolean(issueId),
  });
}

export function useIssueByNumber(projectKeyOrId: string | null, number: number | null) {
  return useQuery({
    queryKey: ISSUE_KEYS.byNumber(projectKeyOrId, number),
    queryFn: () =>
      projectKeyOrId && number !== null
        ? issuesApi.getByProjectAndNumber(projectKeyOrId, number)
        : Promise.reject(new Error("Invalid parameters")),
    enabled: Boolean(projectKeyOrId && number !== null),
  });
}

export function useCreateIssue(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateIssuePayload) => {
      if (!projectId) throw new Error("No active project ID");
      return issuesApi.create(projectId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.all });
    },
  });
}

export function useUpdateIssue(issueId?: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: UpdateIssuePayload }) => {
      const targetId = id || issueId;
      if (!targetId) throw new Error("No issue ID provided");
      return issuesApi.update(targetId, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.all });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.detail(data.id) });
        queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.activities(data.id) });
      }
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["issues", "list", projectId] });
      }
    },
  });
}

export function useDeleteIssue(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) => issuesApi.delete(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.all });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["issues", "list", projectId] });
      }
    },
  });
}

export function useRestoreIssue(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) => issuesApi.restore(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.all });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["issues", "list", projectId] });
      }
    },
  });
}

export function useLabels(projectId: string | null) {
  return useQuery({
    queryKey: ISSUE_KEYS.labels(projectId),
    queryFn: () =>
      projectId ? issuesApi.listLabels(projectId) : Promise.reject(new Error("No project ID")),
    enabled: Boolean(projectId),
  });
}

export function useCreateLabel(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; color: string; description?: string }) => {
      if (!projectId) throw new Error("No active project ID");
      return issuesApi.createLabel(projectId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.labels(projectId) });
    },
  });
}

export function useDeleteLabel(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labelId: string) => issuesApi.deleteLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.labels(projectId) });
    },
  });
}

export function useIssueActivities(issueId: string | null) {
  return useQuery({
    queryKey: ISSUE_KEYS.activities(issueId),
    queryFn: () =>
      issueId ? issuesApi.listActivities(issueId) : Promise.reject(new Error("No issue ID")),
    enabled: Boolean(issueId),
  });
}

export function useIssueUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: IssueFilters = useMemo(() => {
    const res: IssueFilters = {};
    const statusParam = searchParams.get("status");
    if (statusParam) res.status = statusParam;

    const priorityParam = searchParams.get("priority");
    if (priorityParam) res.priority = priorityParam;

    const assigneeParam = searchParams.get("assignee");
    if (assigneeParam) res.assignee = assigneeParam;

    const labelParam = searchParams.get("label");
    if (labelParam) res.label = labelParam;

    const searchStr = searchParams.get("search");
    if (searchStr) res.search = searchStr;

    const orderingParam = searchParams.get("ordering");
    if (orderingParam) res.ordering = orderingParam;

    return res;
  }, [searchParams]);

  const setFilter = useCallback(
    (key: keyof IssueFilters, value: string | undefined | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === undefined || value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ["status", "priority", "assignee", "label", "search", "ordering"].forEach((k) =>
        next.delete(k)
      );
      return next;
    });
  }, [setSearchParams]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.assignee) count++;
    if (filters.label) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilter,
    clearFilters,
    activeFilterCount,
  };
}
