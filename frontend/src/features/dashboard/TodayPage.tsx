import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  GitPullRequest,
  Inbox,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProjects, useProjectToday } from "@/features/projects/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { useUiStore } from "@/stores/useUiStore";
import { useResolveIssue, useUpdateIssue } from "@/features/issues/hooks/useIssues";
import { PriorityIcon } from "@/features/issues/components/PriorityIcon";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { formatRelativeAge, formatShortcut, pluralize } from "@/lib/format";
import type { IssueListItem, IssueStatus } from "@/features/issues/types";

export function TodayPage() {
  const { user } = useAuth();
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { getActiveProject, setCurrentProjectId } = useProjectStore();
  const { openCaptureModal } = useUiStore();
  const { key: routeKey } = useParams<{ key?: string }>();
  const navigate = useNavigate();

  const projectFromKey = routeKey
    ? projects.find((p) => p.key.toLowerCase() === routeKey.toLowerCase())
    : null;
  const activeProject = projectFromKey || getActiveProject(projects);

  const { data: today, isLoading: todayLoading, isError, refetch } = useProjectToday(
    activeProject?.id || null
  );
  const updateMutation = useUpdateIssue(undefined, activeProject?.id);
  const resolveMutation = useResolveIssue(activeProject?.id);

  const [resolvingIssue, setResolvingIssue] = useState<IssueListItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  if (!projectsLoading && projects.length === 0) {
    return (
      <OnboardingFlow
        onComplete={(project) => {
          setCurrentProjectId(project.id);
          refetchProjects();
          navigate("/today");
        }}
      />
    );
  }

  const handleQuickStatus = (issue: IssueListItem, nextStatus: IssueStatus) => {
    if (nextStatus === "done") {
      setResolvingIssue(issue);
      setResolutionNote("");
      return;
    }
    updateMutation.mutate(
      { id: issue.id, payload: { status: nextStatus } },
      {
        onSuccess: () => {
          toast.success(`Moved ${issue.key} to ${nextStatus.replace("_", " ")}`);
          refetch();
        },
      }
    );
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIssue) return;
    try {
      await resolveMutation.mutateAsync({
        issueId: resolvingIssue.id,
        resolution_note: resolutionNote.trim() || "Resolved",
        notify_reporter: true,
      });
      toast.success(`Resolved ${resolvingIssue.key}`);
      setResolvingIssue(null);
      setResolutionNote("");
      refetch();
    } catch {
      toast.error("Could not resolve issue");
    }
  };

  const isLoading = projectsLoading || todayLoading;
  const projectKeyLower = activeProject?.key.toLowerCase() || "";
  const issueHref = (issue: IssueListItem) => {
    const pKey = (issue.project_key || activeProject?.key || issue.key.split("-")[0] || "bug").toLowerCase();
    return `/p/${pKey}/issues/${issue.number}`;
  };

  return (
    <div className="space-y-6" data-testid="today-page">
      <PageHeader
        eyebrow="Project"
        title={`Today · ${activeProject?.name || "Overview"}`}
        description={`Welcome back, ${user?.fullName || user?.displayName || "Engineer"}.`}
        actions={
          <div className="flex items-center gap-2">
            {projects.length > 1 && (
              <select
                value={activeProject?.id || ""}
                onChange={(event) => {
                  const selected = projects.find((p) => p.id === event.target.value);
                  if (selected) {
                    setCurrentProjectId(selected.id);
                    navigate(`/p/${selected.key.toLowerCase()}/today`);
                  }
                }}
                className="h-8 rounded-md border border-border bg-surface px-2 text-xs font-medium text-text focus:border-accent focus:outline-none"
                data-testid="project-select"
                aria-label="Select project"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.key})
                  </option>
                ))}
              </select>
            )}
            <Button size="sm" onClick={openCaptureModal} className="gap-1.5" data-testid="today-capture-btn">
              <Plus className="h-3.5 w-3.5" />
              <span>Capture bug</span>
              <kbd className="hidden rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] sm:inline">
                C
              </kbd>
            </Button>
          </div>
        }
      />

      {isError ? (
        <div className="rounded-xl border border-danger/25 bg-danger/5 p-8 text-center">
          <p className="text-sm font-semibold text-text">Could not load Today</p>
          <Button size="sm" onClick={() => refetch()} className="mt-3">
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4" data-testid="today-loading">
          <div className="h-12 animate-pulse rounded-lg border border-border bg-surface/60" />
          <div className="h-48 animate-pulse rounded-lg border border-border bg-surface/60" />
        </div>
      ) : today ? (
        <>
          {/* Top Strip */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-xs"
            data-testid="today-top-strip"
          >
            <div className="flex flex-wrap items-center gap-2 text-text">
              <Link
                to="/inbox"
                className="inline-flex items-center gap-1.5 font-medium hover:text-accent"
              >
                <Inbox className="h-3.5 w-3.5 text-accent" />
                <span>{pluralize(today.summary.inbox_count, "new")} in Inbox</span>
              </Link>
              <span className="text-text-muted">·</span>
              <Link to="/my-issues" className="font-medium hover:text-accent">
                {pluralize(today.summary.assigned_to_you_count, "issue")} assigned to you
              </Link>
              <span className="text-text-muted">·</span>
              <Link
                to={projectKeyLower ? `/p/${projectKeyLower}/issues?blocking=true` : "/issues?blocking=true"}
                className={`font-medium ${
                  today.summary.blocking_release_count > 0 ? "text-danger" : "text-text-muted"
                } hover:underline`}
              >
                {today.summary.blocking_release_count} blocking release
              </Link>
            </div>

            {today.summary.triager && (
              <span className="text-[11px] text-text-muted">
                Triager:{" "}
                <strong className="text-text">
                  {today.summary.is_current_user_triager ? "You" : today.summary.triager.full_name}
                </strong>
                {today.summary.stale_inbox_count > 0 && (
                  <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    {today.summary.stale_inbox_count} waiting &gt;24h
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Section: Your work */}
            <section
              className="rounded-lg border border-border bg-surface p-4 lg:col-span-7"
              data-testid="today-your-work"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-sm font-semibold text-text">Your work</h2>
                <Link
                  to="/my-issues"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  View all
                </Link>
              </div>

              {today.your_work.length === 0 ? (
                <div className="py-10 text-center text-xs text-text-muted">
                  <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success/60" />
                  Nothing assigned to you right now.{" "}
                  <Link to="/inbox" className="font-medium text-accent hover:underline">
                    Check Inbox
                  </Link>{" "}
                  or press <kbd className="rounded border border-border px-1 font-mono">C</kbd> to capture.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {today.your_work.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <Link
                        to={issueHref(issue)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 group"
                      >
                        <PriorityIcon priority={issue.priority} />
                        <span className="font-mono text-[11px] font-semibold text-text-muted group-hover:text-accent">
                          {issue.key}
                        </span>
                        <span className="truncate text-[13px] font-medium text-text group-hover:text-accent">
                          {issue.title}
                        </span>
                        {issue.is_blocking_release && (
                          <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                            Blocking
                          </span>
                        )}
                      </Link>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {issue.status === "todo" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px]"
                            onClick={() => handleQuickStatus(issue, "in_progress")}
                          >
                            Start
                          </Button>
                        )}
                        {issue.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px]"
                            onClick={() => handleQuickStatus(issue, "in_review")}
                          >
                            Ready for review
                          </Button>
                        )}
                        {(issue.status === "in_progress" || issue.status === "in_review") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] text-success hover:bg-success/10"
                            onClick={() => handleQuickStatus(issue, "done")}
                          >
                            Done
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Right Column: Waiting on you + Team pulse */}
            <div className="space-y-6 lg:col-span-5">
              <section
                className="rounded-lg border border-border bg-surface p-4"
                data-testid="today-waiting-on-you"
              >
                <div className="border-b border-border pb-3">
                  <h2 className="text-sm font-semibold text-text">Waiting on you</h2>
                </div>

                {today.waiting_on_you.prs_awaiting_review.length === 0 &&
                today.waiting_on_you.mentions.length === 0 &&
                today.waiting_on_you.resolved_reported.length === 0 ? (
                  <p className="py-6 text-center text-xs text-text-muted">
                    No PR reviews, mentions, or resolved updates waiting.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60 text-xs">
                    {today.waiting_on_you.prs_awaiting_review.map((issue) => (
                      <Link
                        key={`pr-${issue.id}`}
                        to={issueHref(issue)}
                        className="flex items-center justify-between gap-2 py-2.5 hover:text-accent"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-accent" />
                          <span className="font-mono text-[11px] text-text-muted">{issue.key}</span>
                          <span className="truncate font-medium text-text">{issue.title}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-text-muted">Review</span>
                      </Link>
                    ))}
                    {today.waiting_on_you.mentions.map((issue) => (
                      <Link
                        key={`mention-${issue.id}`}
                        to={issueHref(issue)}
                        className="flex items-center justify-between gap-2 py-2.5 hover:text-accent"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <AtSign className="h-3.5 w-3.5 shrink-0 text-warning" />
                          <span className="font-mono text-[11px] text-text-muted">{issue.key}</span>
                          <span className="truncate font-medium text-text">{issue.title}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-text-muted">@mentioned</span>
                      </Link>
                    ))}
                    {today.waiting_on_you.resolved_reported.map((issue) => (
                      <Link
                        key={`res-${issue.id}`}
                        to={issueHref(issue)}
                        className="flex items-center justify-between gap-2 py-2.5 hover:text-accent"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                          <span className="font-mono text-[11px] text-text-muted">{issue.key}</span>
                          <span className="truncate font-medium text-text">{issue.title}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-success">
                          Fixed {formatRelativeAge(issue.resolved_at || issue.updated_at)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Team pulse (2+ members only) */}
              {today.member_count >= 2 && (
                <section
                  className="rounded-lg border border-border bg-surface p-4"
                  data-testid="today-team-pulse"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
                      <Users className="h-4 w-4 text-text-muted" />
                      Team pulse
                    </h2>
                    <Link
                      to="/settings/members"
                      className="text-xs text-text-muted hover:text-text"
                    >
                      Members
                    </Link>
                  </div>

                  <div className="divide-y divide-border/60 text-xs">
                    {today.team_pulse.map((row) => (
                      <div
                        key={row.user.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
                            {row.user.full_name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate font-medium text-text">
                            {row.user.full_name}
                          </span>
                        </div>
                        {row.current_issue ? (
                          <Link
                            to={issueHref(row.current_issue)}
                            className="flex min-w-0 items-center gap-1.5 truncate text-text-muted hover:text-accent"
                          >
                            <span className="font-mono text-[10px] text-accent">
                              {row.current_issue.key}
                            </span>
                            <span className="truncate">{row.current_issue.title}</span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-text-muted">–</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Resolve with note modal */}
      <Modal
        isOpen={Boolean(resolvingIssue)}
        onClose={() => setResolvingIssue(null)}
        title={`Resolve ${resolvingIssue?.key || ""}`}
        description="Add a quick note — this feeds the changelog and lets the reporter know it's fixed."
      >
        <form onSubmit={handleConfirmResolve} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="today-resolve-note" className="text-xs font-medium text-text">
              What fixed it?
            </label>
            <Input
              id="today-resolve-note"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g. Guarded null customer list in mapper"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setResolvingIssue(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? "Saving…" : `Resolve (${formatShortcut("Enter")})`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
