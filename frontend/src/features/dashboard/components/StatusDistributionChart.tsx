import type { IssueStatus } from "@/features/issues/types";

interface StatusDistributionChartProps {
  byStatus: Record<string, number>;
  totalIssues: number;
}

const STATUS_CONFIG: Record<
  IssueStatus,
  { label: string; color: string; bg: string }
> = {
  backlog: {
    label: "Backlog",
    color: "hsl(var(--status-backlog))",
    bg: "bg-[hsl(var(--status-backlog))]",
  },
  todo: {
    label: "To Do",
    color: "hsl(var(--status-todo))",
    bg: "bg-[hsl(var(--status-todo))]",
  },
  in_progress: {
    label: "In Progress",
    color: "hsl(var(--status-in-progress))",
    bg: "bg-[hsl(var(--status-in-progress))]",
  },
  in_review: {
    label: "In Review",
    color: "hsl(var(--status-in-review))",
    bg: "bg-[hsl(var(--status-in-review))]",
  },
  done: {
    label: "Done",
    color: "hsl(var(--status-done))",
    bg: "bg-[hsl(var(--status-done))]",
  },
  closed: {
    label: "Closed",
    color: "hsl(var(--status-closed))",
    bg: "bg-[hsl(var(--status-closed))]",
  },
};

export function StatusDistributionChart({
  byStatus,
  totalIssues,
}: StatusDistributionChartProps) {
  const items = (Object.keys(STATUS_CONFIG) as IssueStatus[]).map((key) => {
    const config = STATUS_CONFIG[key];
    const count = byStatus[key] || 0;
    const percentage = totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0;
    return {
      key,
      label: config.label,
      count,
      percentage,
      bg: config.bg,
    };
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs" data-testid="status-distribution">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Status Breakdown</h3>
          <p className="text-xs text-text-muted">Issue distribution across workflow states</p>
        </div>
        <span className="text-xs font-semibold text-text">{totalIssues} total</span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface-elevated">
        {items.map((item) =>
          item.count > 0 ? (
            <div
              key={item.key}
              style={{ width: `${(item.count / (totalIssues || 1)) * 100}%` }}
              className={`${item.bg} transition-all duration-300`}
              title={`${item.label}: ${item.count} (${item.percentage}%)`}
            />
          ) : null
        )}
      </div>

      {/* Breakdown Items List */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-elevated/40 p-2.5"
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.bg}`} />
              <span className="text-xs font-medium text-text">{item.label}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-text">{item.count}</span>
              <span className="ml-1 text-[10px] text-text-muted">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
