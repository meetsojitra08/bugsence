import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, FolderPlus, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { ProjectBadge } from "@/features/projects/components/ProjectBadge";
import { CreateProjectModal } from "@/features/projects/components/CreateProjectModal";
import { useNavigate } from "react-router-dom";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: projects = [], isLoading } = useProjects();
  const { getActiveProject } = useProjectStore();
  const activeProject = getActiveProject(projects);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();

  // First-time empty state when no projects exist
  if (!isLoading && projects.length === 0) {
    return (
      <div className="animate-in fade-in flex min-h-[60vh] flex-col items-center justify-center p-6 text-center duration-300">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <FolderPlus className="h-8 w-8" />
        </div>

        <h2 className="text-text-primary mt-5 text-xl font-bold tracking-tight">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">
            Welcome back, {user?.fullName || user?.displayName || "Developer"}
          </h1>
          <p className="text-xs text-text-muted">
            Here is what&apos;s happening across your workspaces today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeProject && (
            <div className="shadow-xs flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5">
              <ProjectBadge name={activeProject.name} projectKey={activeProject.key} size="sm" />
              <span className="text-text-primary text-xs font-semibold">{activeProject.name}</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Gemini AI Ready</span>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="shadow-xs rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Open Issues</span>
            <AlertCircle className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-2 text-2xl font-bold text-text">12</div>
          <div className="mt-1 text-[11px] text-text-muted">+2 created today</div>
        </div>

        <div className="shadow-xs rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Critical Bugs</span>
            <AlertCircle className="h-4 w-4 text-danger" />
          </div>
          <div className="mt-2 text-2xl font-bold text-danger">3</div>
          <div className="mt-1 text-[11px] text-text-muted">Requires urgent triage</div>
        </div>

        <div className="shadow-xs rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Resolved This Week</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-bold text-text">18</div>
          <div className="mt-1 text-[11px] font-medium text-success">↑ 15% velocity</div>
        </div>

        <div className="shadow-xs rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Avg Resolution</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-text">4.2h</div>
          <div className="mt-1 text-[11px] text-text-muted">Under 6h SLA</div>
        </div>
      </div>

      {/* Workspace Quick Launch Card */}
      {activeProject && (
        <div className="shadow-xs rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-text-primary text-base font-semibold">
                  {activeProject.name}
                </span>
                <span className="font-mono text-xs text-text-muted">[{activeProject.key}]</span>
                <span className="rounded bg-surface-elevated px-2 py-0.5 text-[10px] font-medium capitalize text-text-muted">
                  {activeProject.my_role || "member"}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {activeProject.description || "Active project workspace for your team."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/settings/members")}
                className="flex items-center gap-1.5 text-xs"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Manage Members ({activeProject.members_count})</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
