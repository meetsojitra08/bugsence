import { User as UserIcon } from "lucide-react";
import type { ProjectAnalyticsWorkloadItem } from "@/features/projects/types";

interface WorkloadChartProps {
  workload: ProjectAnalyticsWorkloadItem[];
  isLoading?: boolean;
}

export function WorkloadChart({ workload, isLoading }: WorkloadChartProps) {
  const maxIssues = Math.max(...workload.map((w) => w.count), 1);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs" data-testid="workload-chart">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Team Workload Distribution</h3>
          <p className="text-xs text-text-muted">Active open issues assigned per engineer</p>
        </div>
        <span className="text-xs text-text-muted">{workload.length} assignees</span>
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

            return (
              <div key={item.user?.id || `unassigned-${index}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-elevated text-[11px] font-semibold text-text">
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
                    <span className="font-medium text-text">{userName}</span>
                    {item.user === null && (
                      <span className="rounded bg-warning/10 px-1.5 py-0.2 text-[10px] font-medium text-warning">
                        Needs triage
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Priority breakdown mini-pills */}
                    {item.by_priority.urgent > 0 && (
                      <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                        {item.by_priority.urgent} urgent
                      </span>
                    )}
                    {item.by_priority.high > 0 && (
                      <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                        {item.by_priority.high} high
                      </span>
                    )}
                    <span className="font-bold text-text">{item.count} issues</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    style={{ width: `${percentOfMax}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.user === null ? "bg-warning" : "bg-primary"
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
