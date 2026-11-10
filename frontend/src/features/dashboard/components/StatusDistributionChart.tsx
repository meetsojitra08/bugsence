import type { IssueStatus } from "@/features/issues/types";

interface StatusDistributionChartProps {
  byStatus: Record<string, number>;
  totalIssues: number;
}

const STATUS_CONFIG: Record<
  IssueStatus,
  { label: string; color: string; bg: string }
> = {
  inbox: {
    label: "Inbox",
    color: "hsl(var(--accent))",
    bg: "bg-accent",
  },
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
    <div className="rounded-lg border border-border bg-surface p-5" data-testid="status-distribution">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-text">Status Breakdown</h3>
          <p className="text-[12px] text-text-muted">Distribution across workflow states</p>
        </div>
        <span className="text-[12px] font-medium tabular-nums text-text-muted">
          {totalIssues} total
        </span>
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
      <div className="mt-4 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/40 px-2.5 py-1.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${item.bg}`} />
              <span className="truncate text-[12px] font-medium text-text">{item.label}</span>
            </div>
            <span className="flex-shrink-0 text-[11px] tabular-nums text-text-muted">
              <span className="font-medium text-text">{item.count}</span> ({item.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
