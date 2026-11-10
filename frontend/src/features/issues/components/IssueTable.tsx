import React from "react";
import {
  Bug,
  CheckCircle2,
  Circle,
  Clock,
  HelpCircle,
  Inbox,
  Sparkles,
  TrendingUp,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeAge } from "@/lib/format";
import { PriorityIcon } from "./PriorityIcon";
import type { IssueListItem, IssuePriority, IssueStatus, IssueType } from "../types";

interface IssueTableProps {
  issues: IssueListItem[];
  isLoading: boolean;
  selectedIds?: string[];
  onToggleSelect?: (issueId: string) => void;
  onToggleSelectAll?: () => void;
  onSelectIssue: (issue: IssueListItem) => void;
  onUpdateStatus: (issueId: string, status: IssueStatus) => void;
  onUpdatePriority: (issueId: string, priority: IssuePriority) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateClick: () => void;
  groupBy?: "none" | "status" | "priority" | "assignee";
}

const TYPE_ICONS: Record<IssueType, { label: string; icon: React.ReactNode }> = {
  bug: { label: "Bug", icon: <Bug className="h-3.5 w-3.5 text-danger" /> },
  feature: { label: "Feature", icon: <Sparkles className="h-3.5 w-3.5 text-info" /> },
  task: { label: "Task", icon: <CheckCircle2 className="h-3.5 w-3.5 text-success" /> },
  improvement: { label: "Improvement", icon: <TrendingUp className="h-3.5 w-3.5 text-info" /> },
};

const STATUS_CONFIG: Record<IssueStatus, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  inbox: {
    label: "Inbox",
    icon: <Inbox className="h-3 w-3 text-accent" />,
    badgeClass: "text-accent",
  },
  backlog: {
    label: "Backlog",
    icon: <Circle className="h-3 w-3 text-status-backlog" />,
    badgeClass: "text-status-backlog",
  },
  todo: {
    label: "To Do",
    icon: <Circle className="h-3 w-3 text-status-todo" />,
    badgeClass: "text-status-todo",
  },
  in_progress: {
    label: "In Progress",
    icon: <Clock className="h-3 w-3 text-status-in_progress" />,
    badgeClass: "text-status-in_progress",
  },
  in_review: {
    label: "In Review",
    icon: <HelpCircle className="h-3 w-3 text-status-in_review" />,
    badgeClass: "text-status-in_review",
  },
  done: {
    label: "Done",
    icon: <CheckCircle2 className="h-3 w-3 text-status-done" />,
    badgeClass: "text-status-done",
  },
  closed: {
    label: "Closed",
    icon: <CheckCircle2 className="h-3 w-3 text-status-closed" />,
    badgeClass: "text-status-closed",
  },
};

export function IssueTable({
  issues,
  isLoading,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onSelectIssue,
  onUpdateStatus,
  onUpdatePriority,
  hasFilters,
  onClearFilters,
  onCreateClick,
  groupBy = "none",
}: IssueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-1.5 rounded-lg border border-border bg-surface p-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex h-10 animate-pulse items-center gap-4 rounded bg-background/50 px-3"
          >
            <div className="h-4 w-16 rounded bg-surface-elevated" />
            <div className="h-4 flex-1 rounded bg-surface-elevated" />
            <div className="h-4 w-20 rounded bg-surface-elevated" />
            <div className="h-4 w-20 rounded bg-surface-elevated" />
          </div>
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div
        className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"
        data-testid="empty-issues-state"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted">
          <Bug className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-text">
          {hasFilters ? "No issues match your filters" : "No issues in this project yet"}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-text-muted">
          {hasFilters
            ? "Try resetting filters or choosing another saved view."
            : "Capture a bug report, stack trace, or task to get started."}
        </p>
        <div className="mt-4 flex items-center gap-2">
          {hasFilters ? (
            <button
              onClick={onClearFilters}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text hover:bg-surface"
              data-testid="empty-clear-filters-btn"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={onCreateClick}
              className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary-hover"
              data-testid="empty-create-issue-btn"
            >
              Capture first bug
            </button>
          )}
        </div>
      </div>
    );
  }

  const allSelected = issues.length > 0 && issues.every((i) => selectedIds.includes(i.id));
  const colCount = onToggleSelect ? 8 : 7;

  const groupedIssues: { key: string; label: string; items: IssueListItem[] }[] = (() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", items: issues }];
    }
    const buckets = new Map<string, { label: string; items: IssueListItem[] }>();
    for (const issue of issues) {
      let key = "other";
      let label = "Other";
      if (groupBy === "status") {
        key = issue.status;
        label = STATUS_CONFIG[issue.status]?.label || issue.status;
      } else if (groupBy === "priority") {
        key = issue.priority;
        label = issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1);
      } else if (groupBy === "assignee") {
        key = issue.assignee?.id || "unassigned";
        label = issue.assignee?.full_name || "Unassigned";
      }
      const existing = buckets.get(key);
      if (existing) {
        existing.items.push(issue);
      } else {
        buckets.set(key, { label, items: [issue] });
      }
    }
    return Array.from(buckets.entries()).map(([key, val]) => ({ key, ...val }));
  })();

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-[13px]" data-testid="issues-table">
        <thead className="sticky top-0 z-10 border-b border-border bg-surface text-[10px] uppercase tracking-[0.08em] text-text-muted">
          <tr>
            {onToggleSelectAll && (
              <th className="w-10 py-2.5 pl-4 pr-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all issues"
                  className="rounded border-border text-accent"
                  data-testid="select-all-issues-checkbox"
                />
              </th>
            )}
            <th className="w-24 py-2.5 pl-3 pr-2 font-medium">Key</th>
            <th className="px-3 py-2.5 font-medium">Title</th>
            <th className="w-32 px-3 py-2.5 font-medium">Status</th>
            <th className="w-28 px-3 py-2.5 font-medium">Priority</th>
            <th className="w-36 px-3 py-2.5 font-medium">Assignee</th>
            <th className="w-24 px-3 py-2.5 font-medium">Type</th>
            <th className="w-20 py-2.5 pl-3 pr-4 text-right font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {groupedIssues.map((group) => (
            <React.Fragment key={group.key}>
              {group.label && (
                <tr className="bg-surface-elevated/60" data-testid={`issue-group-${group.key}`}>
                  <td
                    colSpan={colCount}
                    className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted"
                  >
                    {group.label} ({group.items.length})
                  </td>
                </tr>
              )}
              {group.items.map((issue) => {
            const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.todo;
            const typeCfg = TYPE_ICONS[issue.type] || TYPE_ICONS.bug;
            const isSelected = selectedIds.includes(issue.id);

            return (
              <tr
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className={cn(
                  "group cursor-pointer transition-colors duration-100 hover:bg-surface-elevated/50",
                  isSelected && "bg-accent/5"
                )}
                data-testid={`issue-row-${issue.number}`}
              >
                {onToggleSelect && (
                  <td
                    className="py-2.5 pl-4 pr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(issue.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      aria-label={`Select ${issue.key}`}
                      className="rounded border-border text-accent"
                      data-testid={`select-issue-${issue.number}`}
                    />
                  </td>
                )}

                {/* Key */}
                <td className="py-2.5 pl-3 pr-2 font-mono text-[11px] font-semibold text-text-muted group-hover:text-accent">
                  {issue.key}
                </td>

                {/* Title */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-1 font-medium text-text transition-colors group-hover:text-accent">
                      {issue.title}
                    </span>
                    {issue.duplicate_of_id ? (
                      <span className="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                        Duplicate
                      </span>
                    ) : ((issue.ai_metadata as { possible_duplicates?: unknown[] } | undefined)
                        ?.possible_duplicates?.length ?? 0) > 0 ? (
                      <span className="shrink-0 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                        Possible dup
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={issue.status}
                    onChange={(e) => onUpdateStatus(issue.id, e.target.value as IssueStatus)}
                    aria-label={`Change status for ${issue.key}`}
                    className={cn(
                      "h-7 cursor-pointer rounded-md border-0 bg-transparent px-1.5 text-[12px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      statusCfg.badgeClass
                    )}
                    data-testid={`issue-status-select-${issue.number}`}
                  >
                    <option value="inbox">Inbox</option>
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>

                {/* Priority */}
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1">
                    <PriorityIcon priority={issue.priority} className="h-3 w-3 shrink-0" />
                    <select
                      value={issue.priority}
                      onChange={(e) => onUpdatePriority(issue.id, e.target.value as IssuePriority)}
                      aria-label={`Change priority for ${issue.key}`}
                      className="h-7 cursor-pointer rounded-md border-0 bg-transparent px-1 text-[12px] font-medium text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      data-testid={`issue-priority-select-${issue.number}`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </td>

                {/* Assignee */}
                <td className="px-3 py-2.5">
                  {issue.assignee ? (
                    <div className="flex items-center gap-1.5 truncate text-[12px] text-text">
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-[9px] font-semibold text-accent">
                        {issue.assignee.full_name?.[0] || "U"}
                      </div>
                      <span className="truncate">{issue.assignee.full_name}</span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                      <UserIcon className="h-3 w-3 opacity-60" />
                      –
                    </span>
                  )}
                </td>

                {/* Type */}
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                    {typeCfg.icon}
                    <span>{typeCfg.label}</span>
                  </span>
                </td>

                {/* Updated */}
                <td className="py-2.5 pl-3 pr-4 text-right font-mono text-[11px] text-text-muted">
                  {formatRelativeAge(issue.updated_at)}
                </td>
              </tr>
            );
          })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
