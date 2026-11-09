import { Sparkles } from "lucide-react";
import type { ProjectAnalyticsOverview } from "@/features/projects/types";

interface AIInsightCardProps {
  overview: ProjectAnalyticsOverview;
}

export function AIInsightCard({ overview }: AIInsightCardProps) {
  const generateInsight = (): string => {
    if (overview.total_issues === 0) {
      return "No issues recorded yet. Create and assign tasks to begin tracking sprint metrics.";
    }

    if (overview.overdue_issues > 0) {
      return `${overview.overdue_issues} issue${overview.overdue_issues > 1 ? "s are" : " is"} currently overdue. Prioritizing overdue blockers will restore sprint velocity.`;
    }

    const urgentCount = overview.by_priority.urgent || 0;
    if (urgentCount > 0) {
      return `Team has ${urgentCount} urgent priority item${urgentCount > 1 ? "s" : ""} in flight with an average resolution cycle of ${overview.avg_resolution_days} days.`;
    }

    const completionRate = Math.round((overview.closed_issues / overview.total_issues) * 100);
    if (completionRate > 60) {
      return `Sprint momentum is strong with a ${completionRate}% completion rate and no critical blockers detected.`;
    }

    return `Workload is well-distributed across ${overview.open_issues} active issues with healthy velocity.`;
  };

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
      data-testid="ai-insight-card"
    >
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/10 text-accent">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-text">Workspace Health Pulse</span>
          <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            Automated
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-text-muted">{generateInsight()}</p>
      </div>
    </div>
  );
}
