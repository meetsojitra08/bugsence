import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, History, Trash2, User as UserIcon, Flame } from "lucide-react";
import {
  useDeleteIssue,
  useIssueActivities,
  useIssueByNumber,
  useRestoreIssue,
  useUpdateIssue,
} from "../hooks/useIssues";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { SafeMarkdown } from "../utils/markdown";
import { hexToRgba } from "@/lib/color";
import { IssueTimeline } from "../components/timeline/IssueTimeline";
import { AISummaryCard } from "../components/ai/AISummaryCard";
import type { IssuePriority, IssueStatus } from "../types";

export function IssueDetailPage() {
  const { key: projectKey, number: numberStr } = useParams<{
    key: string;
    number: string;
  }>();
  const navigate = useNavigate();

  const issueNumber = numberStr ? parseInt(numberStr, 10) : null;
  const { data: issue, isLoading, isError } = useIssueByNumber(projectKey || null, issueNumber);

  const { data: activities = [] } = useIssueActivities(issue?.id || null);
  const { data: members = [] } = useProjectMembers(issue?.project_id || null);

  const updateMutation = useUpdateIssue(issue?.id, issue?.project_id);
  const deleteMutation = useDeleteIssue(issue?.project_id);
  const restoreMutation = useRestoreIssue(issue?.project_id);

  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4 p-4">
        <div className="h-6 w-32 rounded bg-surface-elevated" />
        <div className="h-10 w-3/4 rounded bg-surface-elevated" />
        <div className="h-40 rounded bg-surface-elevated" />
      </div>
    );
  }

  if (isError || !issue) {
    return (
      <div
        className="mx-auto max-w-xl rounded-lg border border-border bg-surface p-8 text-center"
        data-testid="issue-not-found"
      >
        <h2 className="text-base font-semibold text-text">Issue Not Found</h2>
        <p className="mt-1 text-xs text-text-muted">
          The requested issue {projectKey?.toUpperCase()}-{numberStr} does not exist or you do not
          have permission to view it.
        </p>
        <div className="mt-4">
          <Link
            to={projectKey ? `/p/${projectKey.toLowerCase()}/issues` : "/issues"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Issues
          </Link>
        </div>
      </div>
    );
  }

  const handleStatusChange = (newStatus: IssueStatus) => {
    updateMutation.mutate(
      { id: issue.id, payload: { status: newStatus } },
      { onSuccess: () => toast.success("Status updated") }
    );
  };

  const handlePriorityChange = (newPriority: IssuePriority) => {
    updateMutation.mutate(
      { id: issue.id, payload: { priority: newPriority } },
      { onSuccess: () => toast.success("Priority updated") }
    );
  };

  const handleAssigneeChange = (assigneeId: string) => {
    updateMutation.mutate(
      { id: issue.id, payload: { assignee_id: assigneeId || null } },
      { onSuccess: () => toast.success("Assignee updated") }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(issue.id, {
      onSuccess: () => {
        toast(`Issue ${issue.key} deleted`, {
          action: {
            label: "Undo",
            onClick: () => {
              restoreMutation.mutate(issue.id, {
                onSuccess: () => toast.success(`Issue ${issue.key} restored`),
              });
            },
          },
        });
        navigate(projectKey ? `/p/${projectKey.toLowerCase()}/issues` : "/issues");
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="issue-detail-page">
      {/* Top Navigation Breadcrumbs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs">
          <Link
            to={projectKey ? `/p/${projectKey.toLowerCase()}/issues` : "/issues"}
            className="flex items-center gap-1 text-text-muted hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Issues</span>
          </Link>
          <span className="text-text-muted">/</span>
          <span className="font-mono font-semibold text-accent">{issue.key}</span>
        </div>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-text-muted hover:bg-background hover:text-danger"
          data-testid="detail-page-delete-btn"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* Main Content & Sidebar Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main 2-columns */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-text">
              {issue.title}
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Reported by {issue.reporter.full_name} on{" "}
              {new Date(issue.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-border">
            <div className="flex gap-4" role="tablist" aria-label="Issue views">
              <button
                type="button"
                role="tab"
                id="tab-details"
                aria-selected={activeTab === "details"}
                aria-controls="panel-details"
                onClick={() => setActiveTab("details")}
                className={`border-b-2 pb-2 text-xs font-medium transition-colors ${
                  activeTab === "details"
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
                data-testid="page-tab-details"
              >
                Overview & Reproduction
              </button>
              <button
                type="button"
                role="tab"
                id="tab-activity"
                aria-selected={activeTab === "activity"}
                aria-controls="panel-activity"
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-1.5 border-b-2 pb-2 text-xs font-medium transition-colors ${
                  activeTab === "activity"
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
                data-testid="page-tab-activity"
              >
                <History className="h-3.5 w-3.5" />
                Activity Timeline ({activities.length})
              </button>
            </div>
          </div>

          {activeTab === "details" ? (
            <div className="space-y-6" role="tabpanel" id="panel-details" aria-labelledby="tab-details">
              {/* AI Summary Card */}
              <AISummaryCard issueId={issue.id} initialSummary={issue.ai_summary} />

              {/* Description */}
              <div className="shadow-none space-y-2 rounded-lg border border-border bg-surface p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text">
                  Description
                </h3>
                {issue.description ? (
                  <SafeMarkdown content={issue.description} />
                ) : (
                  <p className="text-xs italic text-text-muted">No description provided.</p>
                )}
              </div>

              {/* Reproduction steps */}
              {issue.steps_to_reproduce && (
                <div className="shadow-none space-y-2 rounded-lg border border-border bg-surface p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text">
                    Steps to Reproduce
                  </h3>
                  <SafeMarkdown content={issue.steps_to_reproduce} />
                </div>
              )}

              {/* Expected vs Actual */}
              {(issue.expected || issue.actual) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {issue.expected && (
                    <div className="space-y-1.5 rounded-lg border border-border bg-surface p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-success">
                        Expected Behavior
                      </h4>
                      <p className="text-text-muted text-xs leading-relaxed">
                        {issue.expected}
                      </p>
                    </div>
                  )}
                  {issue.actual && (
                    <div className="space-y-1.5 rounded-lg border border-border bg-surface p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-danger">
                        Actual Behavior
                      </h4>
                      <p className="text-text-muted text-xs leading-relaxed">{issue.actual}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Environment */}
              {issue.environment && (
                <div className="space-y-1 rounded-lg border border-border bg-surface p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Environment
                  </h4>
                  <p className="text-text-muted font-mono text-xs">{issue.environment}</p>
                </div>
              )}
            </div>
          ) : (
            /* Activity & Comments timeline */
            <div
              className="rounded-lg border border-border bg-surface p-5"
              data-testid="activity-timeline"
              role="tabpanel"
              id="panel-activity"
              aria-labelledby="tab-activity"
            >
              <IssueTimeline
                issueId={issue.id}
                projectId={issue.project_id}
                projectKey={issue.project_key}
                issueNumber={issue.number}
              />
            </div>
          )}
        </div>

        {/* Right Properties Sidebar */}
        <div className="space-y-4">
          <div className="shadow-none space-y-4 rounded-lg border border-border bg-surface p-4">
            <h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-text">
              Properties
            </h3>

            {/* Status */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <Clock className="h-3 w-3" /> Status
              </label>
              <select
                value={issue.status}
                onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
                aria-label="Change status on issue detail page"
                className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs font-medium text-text focus:outline-none"
                data-testid="detail-page-status-select"
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
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <Flame className="h-3 w-3" /> Priority
              </label>
              <select
                value={issue.priority}
                onChange={(e) => handlePriorityChange(e.target.value as IssuePriority)}
                aria-label="Change priority on issue detail page"
                className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs font-medium text-text focus:outline-none"
                data-testid="detail-page-priority-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <UserIcon className="h-3 w-3" /> Assignee
              </label>
              <select
                value={issue.assignee?.id || ""}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                aria-label="Change assignee on issue detail page"
                className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-text focus:outline-none"
                data-testid="detail-page-assignee-select"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user.id}>
                    {m.user.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <Calendar className="h-3 w-3" /> Due Date
              </span>
              <p className="px-1 text-xs text-text">
                {issue.due_date
                  ? new Date(`${issue.due_date}T00:00:00`).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No due date set"}
              </p>
            </div>

            {/* Labels */}
            {issue.labels && issue.labels.length > 0 && (
              <div className="space-y-1.5 border-t border-border pt-2">
                <span className="text-[11px] font-medium text-text-muted">Labels</span>
                <div className="flex flex-wrap gap-1.5">
                  {issue.labels.map((lbl) => (
                    <span
                      key={lbl.id}
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: hexToRgba(lbl.color, 0.13),
                        color: lbl.color,
                      }}
                    >
                      {lbl.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
