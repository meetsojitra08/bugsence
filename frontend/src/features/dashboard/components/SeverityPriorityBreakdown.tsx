import type { IssuePriority, IssueSeverity } from "@/features/issues/types";

interface SeverityPriorityBreakdownProps {
  byPriority: Record<string, number>;
  bySeverity: Record<string, number>;
  totalIssues: number;
}

const PRIORITY_META: Record<IssuePriority, { label: string; barColor: string }> = {
  urgent: { label: "Urgent", barColor: "bg-danger" },
  high: { label: "High", barColor: "bg-warning" },
  medium: { label: "Medium", barColor: "bg-primary" },
  low: { label: "Low", barColor: "bg-text-muted/40" },
};

const SEVERITY_META: Record<IssueSeverity, { label: string; barColor: string }> = {
  critical: { label: "Critical", barColor: "bg-danger" },
  major: { label: "Major", barColor: "bg-warning" },
  minor: { label: "Minor", barColor: "bg-primary" },
  trivial: { label: "Trivial", barColor: "bg-text-muted/40" },
};

export function SeverityPriorityBreakdown({
  byPriority,
  bySeverity,
  totalIssues,
}: SeverityPriorityBreakdownProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2" data-testid="severity-priority-breakdown">
      {/* Priority Card */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-text">Priority Breakdown</h3>
        <p className="text-xs text-text-muted">Issue density by urgency level</p>

        <div className="mt-4 space-y-3">
          {(Object.keys(PRIORITY_META) as IssuePriority[]).map((key) => {
            const meta = PRIORITY_META[key];
            const count = byPriority[key] || 0;
            const pct = totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text">{meta.label}</span>
                  <span className="text-text-muted">
                    {count} <span className="text-[10px]">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full ${meta.barColor} rounded-full transition-all duration-300`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Severity Card */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-text">Severity Impact</h3>
        <p className="text-xs text-text-muted">Bug criticality assessment</p>

        <div className="mt-4 space-y-3">
          {(Object.keys(SEVERITY_META) as IssueSeverity[]).map((key) => {
            const meta = SEVERITY_META[key];
            const count = bySeverity[key] || 0;
            const pct = totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text">{meta.label}</span>
                  <span className="text-text-muted">
                    {count} <span className="text-[10px]">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full ${meta.barColor} rounded-full transition-all duration-300`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
