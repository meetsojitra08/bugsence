import { useState } from "react";
import {
  X,
  ExternalLink,
  Trash2,
  Calendar,
  User as UserIcon,
  Clock,
  History,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SafeMarkdown } from "../utils/markdown";
import { useIssue, useIssueActivities, useUpdateIssue } from "../hooks/useIssues";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { IssueTimeline } from "./timeline/IssueTimeline";
import type { IssueListItem, IssuePriority, IssueStatus } from "../types";

interface IssueDetailPanelProps {
  issue: IssueListItem | null;
  onClose: () => void;
  onDelete: (issue: IssueListItem) => void;
  projectId: string;
}

export function IssueDetailPanel({ issue, onClose, onDelete, projectId }: IssueDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");

  const { data: detail } = useIssue(issue?.id || null);
  const { data: activities = [] } = useIssueActivities(issue?.id || null);
  const { data: members = [] } = useProjectMembers(projectId);
  const updateMutation = useUpdateIssue(issue?.id, projectId);

  if (!issue) return null;

  const current = detail || issue;

  const handleStatusChange = (newStatus: IssueStatus) => {
    updateMutation.mutate({
      id: issue.id,
      payload: { status: newStatus },
    });
  };

  const handlePriorityChange = (newPriority: IssuePriority) => {
    updateMutation.mutate({
      id: issue.id,
      payload: { priority: newPriority },
    });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    updateMutation.mutate({
      id: issue.id,
      payload: { assignee_id: assigneeId || null },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Issue ${issue.key} detail panel`}
      className="animate-in slide-in-from-right fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col border-l border-border bg-surface shadow-2xl duration-200"
      data-testid="issue-detail-panel"
    >
      {/* Top action header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-primary">{issue.key}</span>
          <span className="text-text-muted">/</span>
          <span className="max-w-[150px] truncate text-xs text-text-muted">
            {issue.project_key}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/p/${issue.project_key.toLowerCase()}/issues/${issue.number}`}
            className="rounded-md p-1.5 text-text-muted hover:bg-background hover:text-text"
            title="Open full page"
            data-testid="open-full-page-link"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            onClick={() => onDelete(issue)}
            className="rounded-md p-1.5 text-text-muted hover:bg-background hover:text-red-400"
            title="Delete issue"
            data-testid="panel-delete-issue-btn"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted hover:bg-background hover:text-text"
            title="Close panel"
            data-testid="panel-close-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content scrollable area */}
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {/* Title */}
        <div>
          <h2 className="text-base font-semibold leading-snug text-text">{current.title}</h2>
        </div>

        {/* Quick Properties Card */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-background/50 p-3.5 text-xs">
          {/* Status */}
          <div className="space-y-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
              <Clock className="h-3 w-3" /> Status
            </span>
            <select
              value={current.status}
              onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
              aria-label="Change issue status in detail panel"
              className="h-7 w-full rounded border border-border bg-background px-2 text-xs font-medium text-text focus:outline-none"
              data-testid="panel-status-select"
            >
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
              Priority
            </span>
            <select
              value={current.priority}
              onChange={(e) => handlePriorityChange(e.target.value as IssuePriority)}
              aria-label="Change issue priority in detail panel"
              className="h-7 w-full rounded border border-border bg-background px-2 text-xs font-medium text-text focus:outline-none"
              data-testid="panel-priority-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Assignee */}
          <div className="space-y-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
              <UserIcon className="h-3 w-3" /> Assignee
            </span>
            <select
              value={current.assignee?.id || ""}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              aria-label="Change issue assignee in detail panel"
              className="h-7 w-full rounded border border-border bg-background px-2 text-xs text-text focus:outline-none"
              data-testid="panel-assignee-select"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.user.id}>
                  {m.user.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div className="space-y-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
              <Calendar className="h-3 w-3" /> Due Date
            </span>
            <div className="flex h-7 items-center px-2 text-xs text-text">
              {current.due_date || "No due date"}
            </div>
          </div>
        </div>

        {/* Labels */}
        {current.labels && current.labels.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted">Labels</span>
            <div className="flex flex-wrap gap-1.5">
              {current.labels.map((lbl) => (
                <span
                  key={lbl.id}
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${lbl.color}20`,
                    color: lbl.color,
                  }}
                >
                  {lbl.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs: Details vs Activity History */}
        <div className="border-b border-border">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-medium transition-colors ${
                activeTab === "details"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
              data-testid="tab-details"
            >
              <FileText className="h-3.5 w-3.5" />
              Description & Details
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-medium transition-colors ${
                activeTab === "activity"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
              data-testid="tab-activity"
            >
              <History className="h-3.5 w-3.5" />
              Activity ({activities.length})
            </button>
          </div>
        </div>

        {activeTab === "details" ? (
          <div className="space-y-5">
            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text">Description</span>
              {detail?.description ? (
                <div className="rounded-lg border border-border bg-background/50 p-3 text-xs">
                  <SafeMarkdown content={detail.description} />
                </div>
              ) : (
                <p className="text-xs italic text-text-muted">No description provided.</p>
              )}
            </div>

            {/* Reproduction steps */}
            {detail?.steps_to_reproduce && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text">Steps to Reproduce</span>
                <div className="rounded-lg border border-border bg-background/50 p-3 text-xs">
                  <SafeMarkdown content={detail.steps_to_reproduce} />
                </div>
              </div>
            )}

            {/* Expected & Actual */}
            {(detail?.expected || detail?.actual) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {detail.expected && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-400">Expected</span>
                    <p className="text-text-secondary rounded border border-border bg-background/40 p-2 text-xs">
                      {detail.expected}
                    </p>
                  </div>
                )}
                {detail.actual && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-red-400">Actual</span>
                    <p className="text-text-secondary rounded border border-border bg-background/40 p-2 text-xs">
                      {detail.actual}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Environment */}
            {detail?.environment && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-text-muted">Environment</span>
                <p className="text-text-secondary rounded border border-border bg-background/40 p-2 font-mono text-xs">
                  {detail.environment}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Activity & Comments timeline */
          <div data-testid="activity-timeline">
            <IssueTimeline
              issueId={issue.id}
              projectId={projectId}
              projectKey={issue.project_key}
              issueNumber={issue.number}
            />
          </div>
        )}
      </div>
    </div>
  );
}
