import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import type { Project } from "@/features/projects/types";

interface OnboardingChecklistProps {
  project: Project | null;
  totalIssues: number;
}

export function OnboardingChecklist({ project, totalIssues }: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("bugsense_onboarding_dismissed") === "true";
  });
  const navigate = useNavigate();

  if (isDismissed) return null;

  const steps = [
    {
      id: "project",
      label: "Create a project workspace",
      done: Boolean(project),
      action: () => {},
    },
    {
      id: "issue",
      label: "File your first tracked issue",
      done: totalIssues > 0,
      action: () => navigate("/issues"),
    },
    {
      id: "ai",
      label: "Test Gemini AI Triage assistant (⌘J)",
      done: totalIssues > 2,
      action: () => navigate("/issues"),
    },
    {
      id: "members",
      label: "Invite engineering team members",
      done: (project?.members_count || 1) > 1,
      action: () => navigate("/settings/members"),
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  const handleDismiss = () => {
    localStorage.setItem("bugsense_onboarding_dismissed", "true");
    setIsDismissed(true);
  };

  return (
    <div
      className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface to-surface p-5 shadow-xs"
      data-testid="onboarding-checklist"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Workspace Setup Guide</h3>
            <p className="text-xs text-text-muted">
              {completedCount} of {steps.length} milestones completed ({progressPct}%)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-text-muted hover:bg-surface hover:text-text"
          title="Dismiss guide"
          aria-label="Dismiss guide"
          data-testid="dismiss-checklist-btn"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div
          style={{ width: `${progressPct}%` }}
          className="h-full bg-primary rounded-full transition-all duration-300"
        />
      </div>

      {/* Steps List */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.id}
            onClick={step.done ? undefined : step.action}
            className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
              step.done
                ? "border-border/40 bg-surface-elevated/20 text-text-muted line-through"
                : "cursor-pointer border-border/80 bg-surface-elevated/70 text-text hover:border-primary/40 hover:bg-surface-elevated"
            }`}
            data-testid={`checklist-item-${step.id}`}
          >
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-text-muted flex-shrink-0" />
            )}
            <span className="font-medium truncate">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
