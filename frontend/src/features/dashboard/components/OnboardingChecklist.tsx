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
      label: "Create a project",
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
      label: "Run AI triage on a bug report (C)",
      done: totalIssues > 2,
      action: () => navigate("/inbox"),
    },
    {
      id: "members",
      label: "Invite engineering members",
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
      className="rounded-lg border border-border bg-surface p-4"
      data-testid="onboarding-checklist"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/20 bg-accent/10 text-accent">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-text">Project Setup Guide</h3>
            <p className="text-[11px] text-text-muted">
              {completedCount} of {steps.length} complete · {progressPct}%
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded p-1 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
          title="Dismiss guide"
          aria-label="Dismiss guide"
          data-testid="dismiss-checklist-btn"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div
          style={{ width: `${progressPct}%` }}
          className="h-full rounded-full bg-accent transition-all duration-300"
        />
      </div>

      {/* Steps List */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            disabled={step.done}
            onClick={step.done ? undefined : step.action}
            className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[12px] transition-colors ${
              step.done
                ? "border-border/60 bg-background text-text-muted line-through"
                : "border-border bg-background text-text hover:border-accent/40 hover:bg-surface-elevated"
            }`}
            data-testid={`checklist-item-${step.id}`}
          >
            {step.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-success" />
            ) : (
              <Circle className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
            )}
            <span className="truncate font-medium">{step.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
