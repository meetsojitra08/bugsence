import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { issuesApi } from "../api/issuesApi";
import type {
  BoardData,
  CreateCommentPayload,
  CreateIssuePayload,
  IssueFilters,
  IssueListItem,
  IssueStatus,
  MoveIssuePayload,
  TimelineItem,
  UpdateCommentPayload,
  UpdateIssuePayload,
} from "../types";

export const ISSUE_KEYS = {
  all: ["issues"] as const,
  list: (projectId: string | null, filters?: IssueFilters) =>
    ["issues", "list", projectId, filters] as const,
  board: (projectId: string | null, filters?: IssueFilters) =>
    ["issues", "board", projectId, filters] as const,
  detail: (issueId: string | null) => ["issues", "detail", issueId] as const,
  byNumber: (projectKeyOrId: string | null, number: number | null) =>
    ["issues", "byNumber", projectKeyOrId, number] as const,
  labels: (projectId: string | null) => ["issues", "labels", projectId] as const,
  activities: (issueId: string | null) => ["issues", "activities", issueId] as const,
  timeline: (issueIdOrKey: string | null) => ["issues", "timeline", issueIdOrKey] as const,
  comments: (issueId: string | null) => ["issues", "comments", issueId] as const,
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

export function useBoard(projectId: string | null, filters?: IssueFilters) {
  return useQuery({
    queryKey: ISSUE_KEYS.board(projectId, filters),
    queryFn: () =>
      projectId
        ? issuesApi.getBoard(projectId, filters)
        : Promise.reject(new Error("No active project ID")),
    enabled: Boolean(projectId),
  });
}

export function useMoveIssue(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, payload }: { issueId: string; payload: MoveIssuePayload }) =>
      issuesApi.move(issueId, payload),

    onMutate: async ({ issueId, payload }) => {
      if (!projectId) return;

      await queryClient.cancelQueries({ queryKey: ["issues", "board", projectId] });

      const previousBoard = queryClient.getQueryData<BoardData>(
        ISSUE_KEYS.board(projectId, undefined)
      );

      queryClient.setQueriesData<BoardData>({ queryKey: ["issues", "board", projectId] }, (old) => {
        if (!old) return old;

        let targetItem: IssueListItem | null = null;
        const newColumns: Record<IssueStatus, IssueListItem[]> = {
          backlog: [...old.columns.backlog],
          todo: [...old.columns.todo],
          in_progress: [...old.columns.in_progress],
          in_review: [...old.columns.in_review],
          done: [...old.columns.done],
          closed: [...old.columns.closed],
        };

        for (const statusKey of Object.keys(newColumns) as IssueStatus[]) {
          const idx = newColumns[statusKey].findIndex((i) => i.id === issueId);
          if (idx !== -1) {
            targetItem = {
              ...newColumns[statusKey][idx],
              status: payload.status,
            };
            newColumns[statusKey].splice(idx, 1);
            break;
          }
        }

        if (!targetItem) return old;

        const targetCol = newColumns[payload.status];
        if (payload.before_id && payload.after_id) {
          const afterIdx = targetCol.findIndex((i) => i.id === payload.after_id);
          if (afterIdx !== -1) {
            targetCol.splice(afterIdx, 0, targetItem);
          } else {
            targetCol.push(targetItem);
          }
        } else if (payload.after_id) {
          const afterIdx = targetCol.findIndex((i) => i.id === payload.after_id);
          if (afterIdx !== -1) {
            targetCol.splice(afterIdx, 0, targetItem);
          } else {
            targetCol.unshift(targetItem);
          }
        } else {
          targetCol.push(targetItem);
        }

        const newCounts: Record<IssueStatus, number> = {
          backlog: newColumns.backlog.length,
          todo: newColumns.todo.length,
          in_progress: newColumns.in_progress.length,
          in_review: newColumns.in_review.length,
          done: newColumns.done.length,
          closed: newColumns.closed.length,
        };

        return {
          columns: newColumns,
          counts: newCounts,
        };
      });

      return { previousBoard };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousBoard && projectId) {
        queryClient.setQueryData(ISSUE_KEYS.board(projectId, undefined), context.previousBoard);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.all });
    },
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

export function extractMentions(text: string): string[] {
  const regex = /@([a-zA-Z0-9_.+-]+)/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).replace(/[.,;:!?]+$/, ""))));
}

export function useIssueTimeline(issueId?: string, projectKey?: string, issueNumber?: number) {
  const queryKey = issueId
    ? ISSUE_KEYS.timeline(issueId)
    : projectKey && issueNumber
      ? ISSUE_KEYS.timeline(`${projectKey}-${issueNumber}`)
      : ["issues", "timeline", "disabled"];

  return useQuery({
    queryKey,
    queryFn: () => {
      if (issueId) {
        return issuesApi.getTimeline(issueId);
      }
      if (projectKey && issueNumber) {
        return issuesApi.getTimelineByNumber(projectKey, issueNumber);
      }
      return Promise.resolve([]);
    },
    enabled: Boolean(issueId || (projectKey && issueNumber)),
  });
}

export function useCreateComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCommentPayload) => issuesApi.createComment(issueId, payload),
    onMutate: async (newCommentPayload) => {
      await queryClient.cancelQueries({ queryKey: ISSUE_KEYS.timeline(issueId) });
      const previousTimeline = queryClient.getQueryData<TimelineItem[]>(
        ISSUE_KEYS.timeline(issueId)
      );

      const optimisticItem: TimelineItem = {
        id: `optimistic-${Date.now()}`,
        type: "comment",
        actor: {
          id: "me",
          email: "current.user@bugsense.dev",
          full_name: "You",
        },
        verb: "commented",
        field: "",
        old_value: "",
        new_value: "",
        body: newCommentPayload.body,
        is_edited: false,
        edited_at: null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<TimelineItem[]>(ISSUE_KEYS.timeline(issueId), (old) =>
        old ? [...old, optimisticItem] : [optimisticItem]
      );

      return { previousTimeline };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTimeline) {
        queryClient.setQueryData(ISSUE_KEYS.timeline(issueId), context.previousTimeline);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.timeline(issueId) });
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.detail(issueId) });
    },
  });
}

export function useUpdateComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, payload }: { commentId: string; payload: UpdateCommentPayload }) =>
      issuesApi.updateComment(commentId, payload),
    onMutate: async ({ commentId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ISSUE_KEYS.timeline(issueId) });
      const previousTimeline = queryClient.getQueryData<TimelineItem[]>(
        ISSUE_KEYS.timeline(issueId)
      );

      queryClient.setQueryData<TimelineItem[]>(ISSUE_KEYS.timeline(issueId), (old) =>
        old?.map((item) =>
          item.id === commentId
            ? {
                ...item,
                body: payload.body,
                is_edited: true,
                edited_at: new Date().toISOString(),
              }
            : item
        )
      );

      return { previousTimeline };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTimeline) {
        queryClient.setQueryData(ISSUE_KEYS.timeline(issueId), context.previousTimeline);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.timeline(issueId) });
    },
  });
}

export function useDeleteComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => issuesApi.deleteComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ISSUE_KEYS.timeline(issueId) });
      const previousTimeline = queryClient.getQueryData<TimelineItem[]>(
        ISSUE_KEYS.timeline(issueId)
      );

      queryClient.setQueryData<TimelineItem[]>(ISSUE_KEYS.timeline(issueId), (old) =>
        old?.filter((item) => item.id !== commentId)
      );

      return { previousTimeline };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTimeline) {
        queryClient.setQueryData(ISSUE_KEYS.timeline(issueId), context.previousTimeline);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.timeline(issueId) });
    },
  });
}
