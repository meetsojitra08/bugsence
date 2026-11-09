import { User as UserIcon } from "lucide-react";
import type { ProjectAnalyticsWorkloadItem } from "@/features/projects/types";

interface WorkloadChartProps {
  workload: ProjectAnalyticsWorkloadItem[];
  isLoading?: boolean;
}

export function WorkloadChart({ workload, isLoading }: WorkloadChartProps) {
  const maxIssues = Math.max(...workload.map((w) => w.count), 1);
  const assigneeCount = workload.filter((item) => item.user).length;
  const hasUnassigned = workload.some((item) => !item.user);

  return (
    <div className="rounded-lg border border-border bg-surface p-5" data-testid="workload-chart">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-text">Team Workload</h3>
          <p className="text-[12px] text-text-muted">Open issues assigned per engineer</p>
        </div>
        <span className="flex-shrink-0 text-[12px] text-text-muted">
          {assigneeCount} assignees{hasUnassigned ? " · 1 unassigned" : ""}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-text-muted">Loading workload...</div>
        ) : workload.length === 0 ? (
          <div className="py-6 text-center text-xs text-text-muted">No open issues found.</div>
        ) : (
          workload.map((item, index) => {
            const userName = item.user ? item.user.full_name || item.user.email : "Unassigned";
            const percentOfMax = Math.round((item.count / maxIssues) * 100);
            const urgent = item.by_priority.urgent || 0;
            const high = item.by_priority.high || 0;
            const rest = Math.max(0, item.count - urgent - high);
            const total = Math.max(1, item.count);

            return (
              <div key={item.user?.id || `unassigned-${index}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[10px] font-semibold text-text-muted ring-1 ring-border">
                      {item.user?.avatar_url ? (
                        <img
                          src={item.user.avatar_url}
                          alt={userName}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : item.user ? (
                        userName.slice(0, 2).toUpperCase()
                      ) : (
                        <UserIcon className="h-3 w-3 text-text-muted" />
                      )}
                    </div>
                    <span className="truncate font-medium text-text">{userName}</span>
                    {item.user === null && (
                      <span className="flex-shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        Needs triage
                      </span>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    {urgent > 0 && (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        {urgent} urgent
                      </span>
                    )}
                    {high > 0 && (
                      <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                        {high} high
                      </span>
                    )}
                    <span className="font-semibold tabular-nums text-text">
                      {item.count} {item.count === 1 ? "issue" : "issues"}
                    </span>
                  </div>
                </div>

                {/* Stacked workload bar: urgent / high / the rest */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    style={{ width: `${percentOfMax}%` }}
                    className="flex h-full overflow-hidden rounded-full"
                  >
                    {urgent > 0 && (
                      <span
                        style={{ width: `${(urgent / total) * 100}%` }}
                        className="h-full bg-accent"
                      />
                    )}
                    {high > 0 && (
                      <span
                        style={{ width: `${(high / total) * 100}%` }}
                        className="h-full bg-danger"
                      />
                    )}
                    {rest > 0 && (
                      <span
                        style={{ width: `${(rest / total) * 100}%` }}
                        className="h-full bg-text-muted/35"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
