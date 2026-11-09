import type { IssuePriority, IssueSeverity } from "@/features/issues/types";

interface SeverityPriorityBreakdownProps {
  byPriority: Record<string, number>;
  bySeverity: Record<string, number>;
  totalIssues: number;
}

const PRIORITY_META: Record<IssuePriority, { label: string; barColor: string }> = {
  urgent: { label: "Urgent", barColor: "bg-accent" },
  high: { label: "High", barColor: "bg-danger" },
  medium: { label: "Medium", barColor: "bg-text-muted/50" },
  low: { label: "Low", barColor: "bg-text-muted/25" },
};

const SEVERITY_META: Record<IssueSeverity, { label: string; barColor: string }> = {
  critical: { label: "Critical", barColor: "bg-accent" },
  major: { label: "Major", barColor: "bg-danger" },
  minor: { label: "Minor", barColor: "bg-text-muted/50" },
  trivial: { label: "Trivial", barColor: "bg-text-muted/25" },
};

function percentagesFor(
  counts: Record<string, number>,
  keys: readonly string[],
  totalIssues: number
): Record<string, number> {
  if (totalIssues <= 0) return Object.fromEntries(keys.map((key) => [key, 0]));
  const rows = keys.map((key) => ({
    key,
    exact: ((counts[key] || 0) / totalIssues) * 100,
    value: Math.floor(((counts[key] || 0) / totalIssues) * 100),
  }));
  let remainder = 100 - rows.reduce((sum, row) => sum + row.value, 0);
  [...rows]
    .sort((a, b) => b.exact - b.value - (a.exact - a.value))
    .forEach((row) => {
      if (remainder > 0) {
        row.value += 1;
        remainder -= 1;
      }
    });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function SeverityPriorityBreakdown({
  byPriority,
  bySeverity,
  totalIssues,
}: SeverityPriorityBreakdownProps) {
  const priorityKeys = Object.keys(PRIORITY_META) as IssuePriority[];
  const severityKeys = Object.keys(SEVERITY_META) as IssueSeverity[];
  const priorityPct = percentagesFor(byPriority, priorityKeys, totalIssues);
  const severityPct = percentagesFor(bySeverity, severityKeys, totalIssues);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2" data-testid="severity-priority-breakdown">
      {/* Priority Card */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-[14px] font-semibold text-text">Priority Breakdown</h3>
        <p className="text-[12px] text-text-muted">Issue density by urgency level</p>

        <div className="mt-4 space-y-3">
          {priorityKeys.map((key) => {
            const meta = PRIORITY_META[key];
            const count = byPriority[key] || 0;
            const pct = priorityPct[key] ?? 0;
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
      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-[14px] font-semibold text-text">Severity Impact</h3>
        <p className="text-[12px] text-text-muted">Bug criticality assessment</p>

        <div className="mt-4 space-y-3">
          {severityKeys.map((key) => {
            const meta = SEVERITY_META[key];
            const count = bySeverity[key] || 0;
            const pct = severityPct[key] ?? 0;
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
