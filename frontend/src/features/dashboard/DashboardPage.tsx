import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FolderPlus, Plus, Users, LayoutGrid, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { CreateProjectModal } from "@/features/projects/components/CreateProjectModal";
import {
  useProjectOverview,
  useProjectTrends,
  useProjectWorkload,
} from "@/features/projects/hooks/useAnalytics";
import { DashboardKpis } from "./components/DashboardKpis";
import { TrendsChart } from "./components/TrendsChart";
import { StatusDistributionChart } from "./components/StatusDistributionChart";
import { SeverityPriorityBreakdown } from "./components/SeverityPriorityBreakdown";
import { WorkloadChart } from "./components/WorkloadChart";
import { AIInsightCard } from "./components/AIInsightCard";
import { OnboardingChecklist } from "./components/OnboardingChecklist";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { getActiveProject, setCurrentProjectId } = useProjectStore();
  const { key: routeKey } = useParams<{ key?: string }>();
  const navigate = useNavigate();

  const [days, setDays] = useState<number>(30);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const projectFromKey = routeKey ? projects.find((p) => p.key === routeKey) : null;
  const activeProject = projectFromKey || getActiveProject(projects);

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    refetch: refetchOverview,
  } = useProjectOverview(activeProject?.id);
  const { data: trends = [], isLoading: trendsLoading } = useProjectTrends(
    activeProject?.id,
    days
  );
  const { data: workload = [], isLoading: workloadLoading } = useProjectWorkload(
    activeProject?.id
  );

  if (!projectsLoading && projects.length === 0) {
    return (
      <div
        className="animate-in fade-in flex min-h-[60vh] flex-col items-center justify-center text-center duration-300"
        data-testid="dashboard-empty"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-accent shadow-xs">
          <FolderPlus className="h-5 w-5" />
        </div>

        <h2 className="mt-5 text-xl font-semibold tracking-tight text-text">
          Welcome to BugSense, {user?.fullName || "Developer"}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
          Create your first workspace to organize issues, plan sprint boards, and invite your team.
        </p>

        <Button onClick={() => setIsCreateOpen(true)} className="mt-6 gap-2">
          <Plus className="h-4 w-4" />
          Create Your First Project
        </Button>

        <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </div>
    );
  }

  const isLoading = overviewLoading || projectsLoading;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <PageHeader
        eyebrow="Workspace"
        title={`Welcome back, ${user?.fullName || "Developer"}`}
        description="A calm view of project health, throughput, and where attention is needed."
        actions={
          <>
            {projects.length > 1 && (
              <select
                value={activeProject?.id || ""}
                onChange={(event) => {
                  const selected = projects.find((p) => p.id === event.target.value);
                  if (selected) {
                    setCurrentProjectId(selected.id);
                    navigate(`/p/${selected.key.toLowerCase()}/dashboard`);
                  }
                }}
                className="h-8 rounded-md border border-border bg-surface px-2 text-xs font-medium text-text focus:border-accent focus:outline-none"
                data-testid="project-select"
                aria-label="Select project"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.key})
                  </option>
                ))}
              </select>
            )}

            {activeProject && (
              <span className="hidden text-xs text-text-muted sm:inline">
                {activeProject.key} · {activeProject.members_count} members
              </span>
            )}
          </>
        }
      />

      {overviewError ? (
        <div
          className="rounded-xl border border-danger/25 bg-danger/5 p-8 text-center"
          data-testid="dashboard-error-state"
        >
          <p className="text-sm font-semibold text-text">Could not load analytics</p>
          <p className="mt-1 text-xs text-text-muted">
            The dashboard metrics did not load. Your issues are safe.
          </p>
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
          <AIInsightCard overview={overview} />
          <OnboardingChecklist project={activeProject} totalIssues={overview.total_issues} />

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

          {activeProject && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text">
                      {activeProject.name}
                    </span>
                    <span className="font-mono text-[11px] text-text-muted">
                      [{activeProject.key}]
                    </span>
                    <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium capitalize text-text-muted">
                      {activeProject.my_role || "member"}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-xs text-text-muted">
                    {activeProject.description || "Active project workspace for your team."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/p/${activeProject.key}/issues`)}
                    className="gap-1.5 text-xs"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    View issues
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/p/${activeProject.key}/board`)}
                    className="gap-1.5 text-xs"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Board
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/settings/members")}
                    className="gap-1.5 text-xs"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {activeProject.members_count} members
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
