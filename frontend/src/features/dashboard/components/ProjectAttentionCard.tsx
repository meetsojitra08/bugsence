import { ArrowUpRight, CalendarClock, CheckCircle2, ClipboardCheck, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProjectAnalyticsOverview } from "@/features/projects/types";

interface ProjectAttentionCardProps {
  overview: ProjectAnalyticsOverview;
  projectKey?: string;
}

export function ProjectAttentionCard({ overview, projectKey }: ProjectAttentionCardProps) {
  const projectPath = projectKey ? `/p/${projectKey.toLowerCase()}/issues` : "/issues";
  const urgentCount = overview.by_priority.urgent || 0;

  return (
    <section
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      data-testid="project-attention-card"
      aria-labelledby="project-attention-heading"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="project-attention-heading" className="text-sm font-semibold text-text">
              Needs attention
            </h2>
            <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
              Project data
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Issue counts from this project, with links to the work behind them.
          </p>
        </div>
      </div>

      {overview.total_issues === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-background/40 p-3">
          <p className="text-xs font-medium text-text">No issues recorded yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Create an issue to start seeing project attention items here.
          </p>
          <Link
            to={projectPath}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            Open issues <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {overview.overdue_issues > 0 ? (
            <Link
              to={`${projectPath}?overdue=true`}
              className="group flex items-center gap-3 rounded-lg border border-danger/25 bg-danger/5 p-3 transition-colors hover:border-danger/45 hover:bg-danger/10"
              data-testid="overdue-attention-link"
            >
              <CalendarClock className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-text">
                  <span data-testid="overdue-attention-count">{overview.overdue_issues}</span>{" "}
                  overdue {overview.overdue_issues === 1 ? "issue" : "issues"}
                </span>
                <span className="mt-0.5 block text-[11px] text-text-muted">
                  Past the due date and still open · Review
                </span>
              </span>
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span className="text-xs text-text">No overdue issues</span>
            </div>
          )}

          {urgentCount > 0 ? (
            <Link
              to={`${projectPath}?priority=urgent`}
              className="group flex items-center gap-3 rounded-lg border border-warning/25 bg-warning/5 p-3 transition-colors hover:border-warning/45 hover:bg-warning/10"
              data-testid="urgent-attention-link"
            >
              <Flame className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-text">
                  <span data-testid="urgent-attention-count">{urgentCount}</span> urgent{" "}
                  {urgentCount === 1 ? "issue" : "issues"}
                </span>
                <span className="mt-0.5 block text-[11px] text-text-muted">
                  Highest priority work · Review
                </span>
              </span>
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span className="text-xs text-text">No urgent priority issues</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
