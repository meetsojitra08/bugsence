import { AlertCircle, CheckCircle2, Clock, Flame, Layers } from "lucide-react";
import type { ProjectAnalyticsOverview } from "@/features/projects/types";

interface DashboardKpisProps {
  overview: ProjectAnalyticsOverview;
}

export function DashboardKpis({ overview }: DashboardKpisProps) {
  const completionRate =
    overview.total_issues > 0
      ? Math.round((overview.closed_issues / overview.total_issues) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="dashboard-kpis">
      {/* Total Issues */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-primary/40">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium">Total Issues</span>
          <Layers className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-2 text-2xl font-bold text-text" data-testid="kpi-total">
          {overview.total_issues}
        </div>
        <div className="mt-1 text-[11px] text-text-muted">
          Across all active sprints
        </div>
      </div>

      {/* Open Issues */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-warning/40">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium">Open Issues</span>
          <AlertCircle className="h-4 w-4 text-warning" />
        </div>
        <div className="mt-2 text-2xl font-bold text-warning" data-testid="kpi-open">
          {overview.open_issues}
        </div>
        <div className="mt-1 text-[11px] text-text-muted">
          In progress &amp; backlog
        </div>
      </div>

      {/* Resolved Issues */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-success/40">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium">Resolved</span>
          <CheckCircle2 className="h-4 w-4 text-success" />
        </div>
        <div className="mt-2 text-2xl font-bold text-success" data-testid="kpi-closed">
          {overview.closed_issues}
        </div>
        <div className="mt-1 text-[11px] font-medium text-success">
          {completionRate}% completion rate
        </div>
      </div>

      {/* Overdue Issues */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-danger/40">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium">Overdue</span>
          <Flame className={`h-4 w-4 ${overview.overdue_issues > 0 ? "text-danger" : "text-text-muted"}`} />
        </div>
        <div
          className={`mt-2 text-2xl font-bold ${
            overview.overdue_issues > 0 ? "text-danger" : "text-text"
          }`}
          data-testid="kpi-overdue"
        >
          {overview.overdue_issues}
        </div>
        <div className="mt-1 text-[11px] text-text-muted">
          {overview.overdue_issues > 0 ? "Past target due date" : "All issues on schedule"}
        </div>
      </div>

      {/* Avg Resolution Time */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-primary/40">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium">Avg Resolution</span>
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-2 text-2xl font-bold text-text" data-testid="kpi-avg-resolution">
          {overview.avg_resolution_days > 0 ? `${overview.avg_resolution_days}d` : "0d"}
        </div>
        <div className="mt-1 text-[11px] text-text-muted">
          From creation to close
        </div>
      </div>
    </div>
  );
}
