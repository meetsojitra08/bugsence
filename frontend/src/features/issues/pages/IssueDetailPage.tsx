import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  GitBranch,
  GitPullRequest,
  Plus,
  SquareCheck,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ISSUE_KEYS,
  useDeleteIssue,
  useIssueByNumber,
  useLabels,
  useResolveIssue,
  useRestoreIssue,
  useUpdateIssue,
} from "../hooks/useIssues";
import { issuesApi } from "../api/issuesApi";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { SafeMarkdown } from "../utils/markdown";
import { hexToRgba } from "@/lib/color";
import { buildGitBranchName, formatRelativeAge } from "@/lib/format";
import { IssueTimeline } from "../components/timeline/IssueTimeline";
import { AISummaryCard } from "../components/ai/AISummaryCard";
import { PriorityIcon } from "../components/PriorityIcon";
import type { IssueChecklistItem, IssuePriority, IssueStatus, IssueType } from "../types";

export function IssueDetailPage() {
  const { key: projectKey, number: numberStr } = useParams<{
    key: string;
    number: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const issueNumber = numberStr ? parseInt(numberStr, 10) : null;
  const { data: issue, isLoading, isError } = useIssueByNumber(projectKey || null, issueNumber);

  const { data: members = [] } = useProjectMembers(issue?.project_id || null);
  const { data: projectLabels = [] } = useLabels(issue?.project_id || null);

  const updateMutation = useUpdateIssue(issue?.id, issue?.project_id);
  const resolveMutation = useResolveIssue(issue?.project_id);
  const deleteMutation = useDeleteIssue(issue?.project_id);
  const restoreMutation = useRestoreIssue(issue?.project_id);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBranch, setCopiedBranch] = useState(false);
  const [newStepText, setNewStepText] = useState("");
  const [showResolveBox, setShowResolveBox] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [showPrForm, setShowPrForm] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [prTitle, setPrTitle] = useState("");

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
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
        <h2 className="text-base font-semibold text-text">Issue not found</h2>
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

  const refreshIssue = () => {
    queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.byNumber(projectKey || null, issueNumber) });
    queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.detail(issue.id) });
    queryClient.invalidateQueries({ queryKey: ISSUE_KEYS.timeline(issue.id) });
  };

  const handleFieldChange = (payload: Parameters<typeof updateMutation.mutate>[0]["payload"], msg: string) => {
    updateMutation.mutate(
      { id: issue.id, payload },
      {
        onSuccess: () => {
          toast.success(msg);
          refreshIssue();
        },
      }
    );
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${issue.project_key.toLowerCase()}/issues/${issue.number}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    toast.success("Issue link copied");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const branchName = buildGitBranchName(issue.key, issue.title);
  const handleCopyBranch = () => {
    navigator.clipboard?.writeText(`git checkout -b ${branchName}`);
    setCopiedBranch(true);
    toast.success(`Copied branch ${branchName}`);
    setTimeout(() => setCopiedBranch(false), 2000);
  };

  const handleArchive = () => {
    deleteMutation.mutate(issue.id, {
      onSuccess: () => {
        toast(`Archived ${issue.key}`, {
          action: {
            label: "Undo",
            onClick: () => {
              restoreMutation.mutate(issue.id, {
                onSuccess: () => toast.success(`Restored ${issue.key}`),
              });
            },
          },
        });
        navigate(projectKey ? `/p/${projectKey.toLowerCase()}/issues` : "/issues");
      },
    });
  };

  const checklist: IssueChecklistItem[] = Array.isArray(issue.checklist) ? issue.checklist : [];

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim()) return;
    const nextItem: IssueChecklistItem = {
      id: `step-${Date.now()}`,
      text: newStepText.trim(),
      done: false,
    };
    handleFieldChange({ checklist: [...checklist, nextItem] }, "Checklist updated");
    setNewStepText("");
  };

  const handleToggleChecklistItem = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    handleFieldChange({ checklist: updated }, "Checklist updated");
  };

  const handleConvertSubIssue = async (itemId: string) => {
    try {
      const res = await issuesApi.convertChecklistItem(issue.id, itemId);
      toast.success(`Created sub-issue ${res.sub_issue.key}`);
      refreshIssue();
    } catch {
      toast.error("Could not convert checklist item");
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resolveMutation.mutateAsync({
        issueId: issue.id,
        resolution_note: resolutionNote.trim() || "Resolved",
        notify_reporter: true,
      });
      toast.success(`Resolved ${issue.key} and notified reporter`);
      setShowResolveBox(false);
      setResolutionNote("");
      refreshIssue();
    } catch {
      toast.error("Could not resolve issue");
    }
  };

  const handleLinkPr = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(prNumber, 10);
    if (!prUrl.trim() || !Number.isFinite(num)) {
      toast.error("Enter a valid PR number and URL");
      return;
    }
    try {
      await issuesApi.linkPullRequest(issue.id, {
        pr_number: num,
        url: prUrl.trim(),
        title: prTitle.trim() || `PR #${num}`,
        branch: branchName,
        state: "open",
      });
      toast.success(`Linked PR #${num}`);
      setShowPrForm(false);
      setPrUrl("");
      setPrNumber("");
      setPrTitle("");
      refreshIssue();
    } catch {
      toast.error("Could not link PR");
    }
  };

  const toggleLabel = (labelId: string) => {
    const currentIds = (issue.labels || []).map((l) => l.id);
    const nextIds = currentIds.includes(labelId)
      ? currentIds.filter((id) => id !== labelId)
      : [...currentIds, labelId];
    handleFieldChange({ label_ids: nextIds }, "Labels updated");
  };

  const showAiSummary = (issue.comments_count ?? 0) >= 5;

  return (
    <div className="space-y-6" data-testid="issue-detail-page">
      {/* Top Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
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
          {issue.parent && (
            <>
              <span className="text-text-muted">· Sub-issue of</span>
              <Link
                to={`/p/${issue.project_key.toLowerCase()}/issues/${issue.parent.number}`}
                className="font-mono text-accent hover:underline"
              >
                {issue.parent.key}
              </Link>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-7 gap-1.5 text-xs"
            data-testid="copy-issue-link-btn"
          >
            {copiedLink ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            Copy link
          </Button>

          {issue.status !== "done" && issue.status !== "closed" && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowResolveBox((v) => !v)}
              className="h-7 gap-1.5 text-xs"
              data-testid="open-resolve-btn"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve with note
            </Button>
          )}

          <button
            type="button"
            onClick={handleArchive}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-text-muted hover:bg-danger/10 hover:text-danger"
            data-testid="detail-page-delete-btn"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      </div>

      {/* Resolve with Note Inline Card */}
      {showResolveBox && (
        <form
          onSubmit={handleResolveSubmit}
          className="space-y-3 rounded-lg border border-success/35 bg-success/5 p-4"
          data-testid="resolve-with-note-form"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text">
              What fixed it? (Feeds changelog &amp; notifies reporter)
            </h3>
            <button
              type="button"
              onClick={() => setShowResolveBox(false)}
              className="text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Verified raw body bytes in webhook middleware"
              className="h-9 flex-1 bg-background text-xs"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? "Resolving…" : "Resolve & notify"}
            </Button>
          </div>
        </form>
      )}

      {/* Main Content (Title -> Description -> Checklist -> Discussion) + Metadata Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Title */}
          <div>
            <div className="flex items-start gap-2.5">
              <PriorityIcon priority={issue.priority} className="mt-1.5 h-4 w-4 shrink-0" />
              <h1 className="text-2xl font-semibold leading-snug tracking-tight text-text">
                {issue.title}
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Reported by{" "}
              {issue.external_reporter_name ||
                issue.external_reporter_email ||
                issue.reporter.full_name}{" "}
              · {formatRelativeAge(issue.created_at)} ago
            </p>
            {issue.resolution_note && (
              <div className="mt-3 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-text">
                <strong className="text-success">Resolved:</strong> {issue.resolution_note}
              </div>
            )}
          </div>

          {/* 2. Description & Repro */}
          <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Description
            </h2>
            {issue.description ? (
              <SafeMarkdown content={issue.description} />
            ) : (
              <p className="text-xs italic text-text-muted">No description provided.</p>
            )}

            {issue.steps_to_reproduce && (
              <div className="border-t border-border/60 pt-3">
                <h3 className="mb-1.5 text-xs font-semibold text-text">Steps to reproduce</h3>
                <SafeMarkdown content={issue.steps_to_reproduce} />
              </div>
            )}

            {(issue.expected || issue.actual || issue.environment) && (
              <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-3 text-xs sm:grid-cols-2">
                {issue.expected && (
                  <div>
                    <span className="font-semibold text-success">Expected: </span>
                    <span className="text-text-muted">{issue.expected}</span>
                  </div>
                )}
                {issue.actual && (
                  <div>
                    <span className="font-semibold text-danger">Actual: </span>
                    <span className="text-text-muted">{issue.actual}</span>
                  </div>
                )}
                {issue.environment && (
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-text">Environment: </span>
                    <span className="font-mono text-text-muted">{issue.environment}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next steps checklist (converts into sub-issues) */}
          <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <SquareCheck className="h-3.5 w-3.5" />
                Next steps ({checklist.filter((c) => c.done).length}/{checklist.length})
              </h2>
            </div>

            {checklist.length > 0 && (
              <div className="divide-y divide-border/60">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className="rounded border-border text-accent"
                      />
                      <span className={item.done ? "line-through text-text-muted" : "text-text"}>
                        {item.text}
                      </span>
                    </label>
                    {item.sub_issue_key ? (
                      <Link
                        to={`/p/${issue.project_key.toLowerCase()}/issues/${item.sub_issue_key.split("-")[1]}`}
                        className="shrink-0 rounded bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-medium text-accent hover:underline"
                      >
                        {item.sub_issue_key}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvertSubIssue(item.id)}
                        className="shrink-0 text-[11px] font-medium text-accent hover:underline"
                      >
                        Convert to sub-issue
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddChecklistItem} className="flex gap-2">
              <Input
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                placeholder="Add next step…"
                className="h-8 bg-background text-xs"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </form>
          </div>

          {/* AI Thread Summary: only shown when 5+ comments exist */}
          {showAiSummary && <AISummaryCard issueId={issue.id} initialSummary={issue.ai_summary} />}

          {/* 4. Unified Discussion & Activity Timeline */}
          <div
            className="rounded-lg border border-border bg-surface p-5"
            data-testid="activity-timeline"
          >
            <h2 className="mb-4 border-b border-border pb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Discussion &amp; activity
            </h2>
            <IssueTimeline
              issueId={issue.id}
              projectId={issue.project_id}
              projectKey={issue.project_key}
              issueNumber={issue.number}
            />
          </div>
        </div>

        {/* 3. Right Metadata & GitHub Sidebar */}
        <div className="space-y-4">
          <div className="space-y-3.5 rounded-lg border border-border bg-surface p-4">
            <h3 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Metadata
            </h3>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted">Status</label>
              <select
                value={issue.status}
                onChange={(e) =>
                  handleFieldChange({ status: e.target.value as IssueStatus }, "Status updated")
                }
                aria-label="Change status on issue detail page"
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-text focus:outline-none"
                data-testid="detail-page-status-select"
              >
                <option value="inbox">Inbox</option>
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-muted">Priority</label>
                <select
                  value={issue.priority}
                  onChange={(e) =>
                    handleFieldChange(
                      { priority: e.target.value as IssuePriority },
                      "Priority updated"
                    )
                  }
                  aria-label="Change priority on issue detail page"
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-text focus:outline-none"
                  data-testid="detail-page-priority-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-muted">Type</label>
                <select
                  value={issue.type}
                  onChange={(e) =>
                    handleFieldChange({ type: e.target.value as IssueType }, "Type updated")
                  }
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-text focus:outline-none"
                >
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="task">Task</option>
                  <option value="improvement">Improvement</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted">Assignee</label>
              <select
                value={issue.assignee?.id || ""}
                onChange={(e) =>
                  handleFieldChange(
                    { assignee_id: e.target.value || null },
                    "Assignee updated"
                  )
                }
                aria-label="Change assignee on issue detail page"
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-text focus:outline-none"
                data-testid="detail-page-assignee-select"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user.id}>
                    {m.user.full_name || m.user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-muted">Due date</label>
              <Input
                type="date"
                value={issue.due_date || ""}
                onChange={(e) =>
                  handleFieldChange(
                    { due_date: e.target.value || null },
                    "Due date updated"
                  )
                }
                className="h-8 bg-background text-xs"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 border-t border-border/60 pt-2.5 text-xs text-text">
              <input
                type="checkbox"
                checked={Boolean(issue.is_blocking_release)}
                onChange={(e) =>
                  handleFieldChange(
                    { is_blocking_release: e.target.checked },
                    "Release blocker updated"
                  )
                }
                className="rounded border-border text-danger"
              />
              <span>Blocking release</span>
            </label>

            <div className="space-y-1.5 border-t border-border/60 pt-2.5">
              <span className="text-[11px] font-medium text-text-muted">Labels</span>
              <div className="flex flex-wrap gap-1.5">
                {projectLabels.map((lbl) => {
                  const active = (issue.labels || []).some((l) => l.id === lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      onClick={() => toggleLabel(lbl.id)}
                      className="rounded border px-2 py-0.5 text-[11px] font-medium transition-colors"
                      style={{
                        borderColor: active ? lbl.color : "hsl(var(--border))",
                        backgroundColor: active ? hexToRgba(lbl.color, 0.14) : "transparent",
                        color: active ? lbl.color : "hsl(var(--text-muted))",
                      }}
                    >
                      {lbl.name}
                    </button>
                  );
                })}
                {projectLabels.length === 0 && (
                  <span className="text-[11px] text-text-muted">No labels in project</span>
                )}
              </div>
            </div>

            {(issue.duplicate_of || (issue.sub_issues && issue.sub_issues.length > 0)) && (
              <div className="space-y-1.5 border-t border-border/60 pt-2.5 text-xs">
                <span className="text-[11px] font-medium text-text-muted">Related issues</span>
                {issue.duplicate_of && (
                  <Link
                    to={`/p/${issue.project_key.toLowerCase()}/issues/${issue.duplicate_of.number}`}
                    className="block truncate text-accent hover:underline"
                  >
                    Duplicate of {issue.duplicate_of.key}: {issue.duplicate_of.title}
                  </Link>
                )}
                {issue.sub_issues?.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/p/${issue.project_key.toLowerCase()}/issues/${sub.number}`}
                    className="block truncate text-accent hover:underline"
                  >
                    Sub-issue {sub.key}: {sub.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* GitHub Branch & Linked PRs Block */}
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <GitPullRequest className="h-3.5 w-3.5" />
                GitHub
              </h3>
              <button
                type="button"
                onClick={() => setShowPrForm((v) => !v)}
                className="text-[11px] font-medium text-accent hover:underline"
              >
                Link PR
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyBranch}
              className="w-full justify-between text-xs"
              data-testid="create-branch-btn"
            >
              <span className="flex items-center gap-1.5 truncate font-mono text-[11px]">
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-accent" />
                {branchName}
              </span>
              {copiedBranch ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              )}
            </Button>

            {showPrForm && (
              <form onSubmit={handleLinkPr} className="space-y-2 rounded border border-border bg-background/60 p-2.5">
                <Input
                  type="number"
                  placeholder="PR # (e.g. 42)"
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="PR URL (https://github.com/...)"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Title (optional)"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  className="h-7 text-xs"
                />
                <Button type="submit" size="sm" className="h-7 w-full text-xs">
                  Save PR link
                </Button>
              </form>
            )}

            {issue.pull_requests && issue.pull_requests.length > 0 ? (
              <div className="space-y-2">
                {issue.pull_requests.map((pr) => (
                  <a
                    key={pr.id}
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded border border-border bg-background/50 p-2 text-xs hover:border-accent"
                  >
                    <span className="min-w-0 truncate">
                      <strong className="font-mono text-accent">#{pr.pr_number}</strong>{" "}
                      {pr.title || pr.branch}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                        pr.ci_status === "success"
                          ? "bg-success/15 text-success"
                          : pr.ci_status === "failure"
                            ? "bg-danger/15 text-danger"
                            : "bg-surface-elevated text-text-muted"
                      }`}
                    >
                      {pr.state} · {pr.ci_status}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-text-muted">
                Mention <span className="font-mono">{issue.key}</span> in a PR branch or title to
                auto-move to In Review &amp; Done on merge.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
