import { Sparkles } from "lucide-react";
import type { ProjectAnalyticsOverview } from "@/features/projects/types";

interface AIInsightCardProps {
  overview: ProjectAnalyticsOverview;
}

export function AIInsightCard({ overview }: AIInsightCardProps) {
  // Generate a dynamic, context-aware project health insight
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
      className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-surface to-surface p-4 shadow-xs"
      data-testid="ai-insight-card"
    >
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-purple-400">Gemini AI Health Pulse</span>
          <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
            Automated
          </span>
        </div>
        <p className="mt-1 text-xs text-text-muted">{generateInsight()}</p>
      </div>
    </div>
  );
}
