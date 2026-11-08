import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FolderPlus, Plus, Sparkles, Users, LayoutGrid, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { ProjectBadge } from "@/features/projects/components/ProjectBadge";
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

  // If URL has project key, locate it, otherwise get active project from store
  const projectFromKey = routeKey ? projects.find((p) => p.key === routeKey) : null;
  const activeProject = projectFromKey || getActiveProject(projects);

  // Analytics queries
  const { data: overview, isLoading: overviewLoading } = useProjectOverview(activeProject?.id);
  const { data: trends = [], isLoading: trendsLoading } = useProjectTrends(
    activeProject?.id,
    days
  );
  const { data: workload = [], isLoading: workloadLoading } = useProjectWorkload(
    activeProject?.id
  );

  // Handle first-time empty state when no projects exist
  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="animate-in fade-in flex min-h-[60vh] flex-col items-center justify-center p-6 text-center duration-300">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <FolderPlus className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-xl font-bold tracking-tight text-text">
          Welcome to BugSense, {user?.fullName || "Developer"}!
        </h2>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Get started by creating your first project workspace. A project allows you to organize
          issues, plan sprint boards, and invite team members.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Create Your First Project</span>
          </Button>
        </div>

        <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </div>
    );
  }

  const isLoading = overviewLoading || projectsLoading;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">
            Welcome back, {user?.fullName || "Developer"}
          </h1>
          <p className="text-xs text-text-muted">
            Here is your project health and engineering velocity at a glance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 1 && (
            <select
              value={activeProject?.id || ""}
              onChange={(e) => {
                const selected = projects.find((p) => p.id === e.target.value);
                if (selected) {
                  setCurrentProjectId(selected.id);
                  if (routeKey) {
                    navigate(`/p/${selected.key}/dashboard`);
                  }
                }
              }}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text focus:outline-hidden"
              data-testid="project-select"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          )}

          {activeProject && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 shadow-xs">
              <ProjectBadge name={activeProject.name} projectKey={activeProject.key} size="sm" />
              <span className="text-xs font-semibold text-text">{activeProject.name}</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Analytics Active</span>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-6" data-testid="dashboard-loading-skeleton">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-surface/50 p-4"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl border border-border bg-surface/50" />
        </div>
      ) : overview ? (
        <>
          {/* AI Insight Card */}
          <AIInsightCard overview={overview} />

          {/* Onboarding Setup Guide */}
          <OnboardingChecklist
            project={activeProject}
            totalIssues={overview.total_issues}
          />

          {/* KPI Stat Cards */}
          <DashboardKpis overview={overview} />

          {/* Activity Trends and Status Distribution */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TrendsChart
                data={trends}
                days={days}
                onDaysChange={setDays}
                isLoading={trendsLoading}
              />
            </div>
            <div>
              <StatusDistributionChart
                byStatus={overview.by_status}
                totalIssues={overview.total_issues}
              />
            </div>
          </div>

          {/* Severity/Priority Breakdown & Team Workload */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SeverityPriorityBreakdown
              byPriority={overview.by_priority}
              bySeverity={overview.by_severity}
              totalIssues={overview.total_issues}
            />
            <WorkloadChart workload={workload} isLoading={workloadLoading} />
          </div>

          {/* Quick Launch Card */}
          {activeProject && (
            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text">{activeProject.name}</span>
                    <span className="font-mono text-xs text-text-muted">[{activeProject.key}]</span>
                    <span className="rounded bg-surface-elevated px-2 py-0.5 text-[10px] font-medium capitalize text-text-muted">
                      {activeProject.my_role || "member"}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {activeProject.description || "Active project workspace for your team."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/p/${activeProject.key}/issues`)}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>View Issues</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/p/${activeProject.key}/board`)}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Kanban Board</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/settings/members")}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Members ({activeProject.members_count})</span>
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
