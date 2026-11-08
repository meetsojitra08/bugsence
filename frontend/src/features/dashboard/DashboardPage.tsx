import { Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">
            Welcome back, {user?.fullName || user?.displayName || "Developer"}
          </h1>
          <p className="text-xs text-text-muted">
            Here is what&apos;s happening across your workspaces today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
            <Sparkles className="h-3.5 w-3.5" />
            AI Triage Ready
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

      {/* Placeholder Overview Board Box */}
      <div className="shadow-xs rounded-xl border border-border bg-surface p-8 text-center">
        <h3 className="text-sm font-semibold text-text">BugSense Workspace Active</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-text-muted">
          Phase 1 Auth and App Shell active. Use the sidebar or press{" "}
          <kbd className="font-mono text-primary">⌘K</kbd> to launch the command menu.
        </p>
      </div>
    </div>
  );
}
