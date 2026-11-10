import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import {
  useProjectOverview,
  useProjectTrends,
  useProjectWorkload,
} from "@/features/projects/hooks/useAnalytics";
import { useChangelog } from "@/features/issues/hooks/useIssues";
import { DashboardKpis } from "./components/DashboardKpis";
import { TrendsChart } from "./components/TrendsChart";
import { StatusDistributionChart } from "./components/StatusDistributionChart";
import { SeverityPriorityBreakdown } from "./components/SeverityPriorityBreakdown";
import { WorkloadChart } from "./components/WorkloadChart";
import { ProjectAttentionCard } from "./components/ProjectAttentionCard";

export function InsightsPage() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { getActiveProject, setCurrentProjectId } = useProjectStore();
  const { key: routeKey } = useParams<{ key?: string }>();
  const navigate = useNavigate();

  const [days, setDays] = useState<number>(30);

  const projectFromKey = routeKey
    ? projects.find((p) => p.key.toLowerCase() === routeKey.toLowerCase())
    : null;
  const activeProject = projectFromKey || getActiveProject(projects);

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    refetch: refetchOverview,
  } = useProjectOverview(activeProject?.id);
  const { data: trends = [], isLoading: trendsLoading } = useProjectTrends(activeProject?.id, days);
  const { data: workload = [], isLoading: workloadLoading } = useProjectWorkload(activeProject?.id);
  const { data: changelog = [] } = useChangelog(activeProject?.id || null);

  const isLoading = overviewLoading || projectsLoading;

  return (
    <div className="space-y-6" data-testid="insights-page">
      <PageHeader
        eyebrow="Project"
        title="Insights"
        description="Throughput trends, workload, and resolution changelog."
        actions={
          projects.length > 1 ? (
            <select
              value={activeProject?.id || ""}
              onChange={(event) => {
                const selected = projects.find((p) => p.id === event.target.value);
                if (selected) {
                  setCurrentProjectId(selected.id);
                  navigate(`/p/${selected.key.toLowerCase()}/insights`);
                }
              }}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs font-medium text-text focus:border-accent focus:outline-none"
              aria-label="Select project"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.key})
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {overviewError ? (
        <div
          className="rounded-xl border border-danger/25 bg-danger/5 p-8 text-center"
          data-testid="dashboard-error-state"
        >
          <p className="text-sm font-semibold text-text">Could not load insights</p>
          <Button size="sm" onClick={() => refetchOverview()} className="mt-4">
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-5" data-testid="dashboard-loading-skeleton">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-lg border border-border bg-surface/60"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-lg border border-border bg-surface/60" />
        </div>
      ) : overview ? (
        <>
          <ProjectAttentionCard overview={overview} projectKey={activeProject?.key || ""} />
          <DashboardKpis overview={overview} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <TrendsChart
                data={trends}
                days={days}
                onDaysChange={setDays}
                isLoading={trendsLoading}
              />
            </div>
            <div className="lg:col-span-4">
              <StatusDistributionChart
                byStatus={overview.by_status}
                totalIssues={overview.total_issues}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <WorkloadChart workload={workload} isLoading={workloadLoading} />
            </div>
            <div className="lg:col-span-5">
              <SeverityPriorityBreakdown
                byPriority={overview.by_priority}
                bySeverity={overview.by_severity}
                totalIssues={overview.total_issues}
              />
            </div>
          </div>

          {/* Resolution Changelog */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="border-b border-border pb-3 text-sm font-semibold text-text">
              Resolution changelog
            </h2>
            {changelog.length === 0 ? (
              <p className="py-6 text-center text-xs text-text-muted">
                Resolved issues with &ldquo;What fixed it?&rdquo; notes will appear here.
              </p>
            ) : (
              <div className="divide-y divide-border/60 text-xs">
                {changelog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-start justify-between gap-2 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                        <Link
                          to={`/p/${activeProject?.key.toLowerCase()}/issues/${entry.number}`}
                          className="font-mono font-semibold text-accent hover:underline"
                        >
                          {entry.key}
                        </Link>
                        <span className="font-medium text-text">{entry.title}</span>
                      </div>
                      <p className="pl-5 text-text-muted">{entry.resolution_note}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-text-muted">
                      {new Date(entry.resolved_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
