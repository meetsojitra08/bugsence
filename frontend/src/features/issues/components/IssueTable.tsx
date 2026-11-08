import React from "react";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  HelpCircle,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssueListItem, IssuePriority, IssueStatus, IssueType } from "../types";

interface IssueTableProps {
  issues: IssueListItem[];
  isLoading: boolean;
  onSelectIssue: (issue: IssueListItem) => void;
  onUpdateStatus: (issueId: string, status: IssueStatus) => void;
  onUpdatePriority: (issueId: string, priority: IssuePriority) => void;
  onDeleteIssue: (issue: IssueListItem) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateClick: () => void;
}

const TYPE_ICONS: Record<IssueType, React.ReactNode> = {
  bug: <Bug className="h-3.5 w-3.5 text-red-400" />,
  feature: <Sparkles className="h-3.5 w-3.5 text-blue-400" />,
  task: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  improvement: <AlertCircle className="h-3.5 w-3.5 text-amber-400" />,
};

const STATUS_CONFIG: Record<
  IssueStatus,
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  backlog: {
    label: "Backlog",
    icon: <Circle className="h-3 w-3 text-zinc-500" />,
    badgeClass: "bg-zinc-800/60 text-zinc-400 border-zinc-700/50",
  },
  todo: {
    label: "To Do",
    icon: <Circle className="h-3 w-3 text-zinc-400" />,
    badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-600/50",
  },
  in_progress: {
    label: "In Progress",
    icon: <Clock className="h-3 w-3 text-blue-400" />,
    badgeClass: "bg-blue-950/60 text-blue-300 border-blue-800/50",
  },
  in_review: {
    label: "In Review",
    icon: <HelpCircle className="h-3 w-3 text-purple-400" />,
    badgeClass: "bg-purple-950/60 text-purple-300 border-purple-800/50",
  },
  done: {
    label: "Done",
    icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
    badgeClass: "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
  },
  closed: {
    label: "Closed",
    icon: <CheckCircle2 className="h-3 w-3 text-zinc-500" />,
    badgeClass: "bg-zinc-900 text-zinc-400 border-zinc-800",
  },
};

const PRIORITY_CONFIG: Record<
  IssuePriority,
  { label: string; icon: React.ReactNode; textClass: string }
> = {
  urgent: {
    label: "Urgent",
    icon: <Flame className="h-3.5 w-3.5 text-red-400" />,
    textClass: "text-red-400 font-semibold",
  },
  high: {
    label: "High",
    icon: <Flame className="h-3.5 w-3.5 text-amber-400" />,
    textClass: "text-amber-400",
  },
  medium: {
    label: "Medium",
    icon: <Circle className="h-3 w-3 text-yellow-400" />,
    textClass: "text-yellow-400",
  },
  low: {
    label: "Low",
    icon: <Circle className="h-3 w-3 text-blue-400" />,
    textClass: "text-blue-400",
  },
};

export function IssueTable({
  issues,
  isLoading,
  onSelectIssue,
  onUpdateStatus,
  onUpdatePriority,
  onDeleteIssue,
  hasFilters,
  onClearFilters,
  onCreateClick,
}: IssueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex h-10 animate-pulse items-center gap-4 rounded bg-background/50 px-3"
          >
            <div className="h-4 w-16 rounded bg-zinc-800" />
            <div className="h-4 flex-1 rounded bg-zinc-800" />
            <div className="h-4 w-20 rounded bg-zinc-800" />
            <div className="h-4 w-20 rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div
        className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center"
        data-testid="empty-issues-state"
      >
        <div className="shadow-xs flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-text-muted">
          <Bug className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-text">
          {hasFilters ? "No issues match your filters" : "No issues in this project yet"}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-text-muted">
          {hasFilters
            ? "Try resetting filters or adjusting search queries to discover other issues."
            : "Get started by creating your first issue, tracking bugs, and assigning work."}
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
              className="shadow-xs rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
              data-testid="empty-create-issue-btn"
            >
              Create first issue
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shadow-xs overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-xs" data-testid="issues-table">
        <thead className="backdrop-blur-xs sticky top-0 z-10 border-b border-border bg-surface/90 font-semibold text-text-muted">
          <tr>
            <th className="w-24 py-2.5 pl-4 pr-2">Key</th>
            <th className="px-3 py-2.5">Title</th>
            <th className="w-32 px-3 py-2.5">Status</th>
            <th className="w-28 px-3 py-2.5">Priority</th>
            <th className="w-36 px-3 py-2.5">Assignee</th>
            <th className="w-36 px-3 py-2.5">Labels</th>
            <th className="w-16 py-2.5 pl-2 pr-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {issues.map((issue) => {
            const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.todo;
            const priorityCfg = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.medium;

            return (
              <tr
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className="group cursor-pointer transition-colors duration-100 hover:bg-background/60"
                data-testid={`issue-row-${issue.number}`}
              >
                {/* Key */}
                <td className="py-2.5 pl-4 pr-2 font-mono text-[11px] font-semibold text-text-muted group-hover:text-primary">
                  {issue.key}
                </td>

                {/* Title & Type */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span title={issue.type} className="flex-shrink-0">
                      {TYPE_ICONS[issue.type] || TYPE_ICONS.bug}
                    </span>
                    <span className="truncate font-medium text-text transition-colors group-hover:text-primary">
                      {issue.title}
                    </span>
                  </div>
                </td>

                {/* Status Dropdown */}
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={issue.status}
                    onChange={(e) => onUpdateStatus(issue.id, e.target.value as IssueStatus)}
                    aria-label={`Change status for ${issue.key}`}
                    className={cn(
                      "cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all focus:outline-none",
                      statusCfg.badgeClass
                    )}
                    data-testid={`issue-status-select-${issue.number}`}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>

                {/* Priority Dropdown */}
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={issue.priority}
                    onChange={(e) => onUpdatePriority(issue.id, e.target.value as IssuePriority)}
                    aria-label={`Change priority for ${issue.key}`}
                    className={cn(
                      "cursor-pointer rounded-md border border-border/60 bg-background/50 px-2 py-0.5 text-[11px] font-medium transition-all focus:outline-none",
                      priorityCfg.textClass
                    )}
                    data-testid={`issue-priority-select-${issue.number}`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </td>

                {/* Assignee */}
                <td className="px-3 py-2.5">
                  {issue.assignee ? (
                    <div className="flex items-center gap-1.5 truncate text-[11px] text-text">
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">
                        {issue.assignee.full_name?.[0] || "U"}
                      </div>
                      <span className="truncate">{issue.assignee.full_name}</span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] italic text-text-muted">
                      <UserIcon className="h-3 w-3 opacity-60" />
                      Unassigned
                    </span>
                  )}
                </td>

                {/* Labels */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {issue.labels?.slice(0, 2).map((lbl) => (
                      <span
                        key={lbl.id}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${lbl.color}20`,
                          color: lbl.color,
                        }}
                      >
                        {lbl.name}
                      </span>
                    ))}
                    {(issue.labels?.length || 0) > 2 && (
                      <span className="text-[10px] text-text-muted">
                        +{(issue.labels?.length || 0) - 2}
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-2.5 pl-2 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDeleteIssue(issue)}
                    title="Delete issue"
                    className="p-1 text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    data-testid={`delete-issue-btn-${issue.number}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
