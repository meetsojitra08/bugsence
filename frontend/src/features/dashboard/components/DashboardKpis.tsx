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

  const cards = [
    {
      label: "Total issues",
      value: overview.total_issues,
      hint: "Across this project",
      icon: Layers,
      testId: "kpi-total",
    },
    {
      label: "Open",
      value: overview.open_issues,
      hint: "Backlog, todo, in progress",
      icon: AlertCircle,
      testId: "kpi-open",
    },
    {
      label: "Resolved",
      value: overview.closed_issues,
      hint: `${completionRate}% completion rate`,
      icon: CheckCircle2,
      testId: "kpi-closed",
    },
    {
      label: "Overdue",
      value: overview.overdue_issues,
      hint: overview.overdue_issues > 0 ? "Past target due date" : "All on schedule",
      icon: Flame,
      testId: "kpi-overdue",
    },
    {
      label: "Avg resolution",
      value: overview.avg_resolution_days > 0 ? `${overview.avg_resolution_days}d` : "0d",
      hint: "From creation to close",
      icon: Clock,
      testId: "kpi-avg-resolution",
    },
  ];

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      data-testid="dashboard-kpis"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const isOverdue = card.testId === "kpi-overdue" && overview.overdue_issues > 0;
        return (
          <div
            key={card.testId}
            className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-text-muted/30"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted">
                {card.label}
              </span>
              <Icon className="h-3.5 w-3.5 text-text-muted" />
            </div>
            <div
              className={`mt-2.5 text-[26px] font-semibold tabular-nums leading-none tracking-tight ${
                isOverdue ? "text-danger" : "text-text"
              }`}
              data-testid={card.testId}
            >
              {card.value}
            </div>
            <div className="mt-1.5 text-[11px] text-text-muted">{card.hint}</div>
          </div>
        );
      })}
    </div>
  );
}
