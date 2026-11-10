import { useState } from "react";
import { Check, Copy, GitPullRequest, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProject } from "@/features/projects/hooks/useProjects";
import { projectsApi } from "@/features/projects/api/projectsApi";
import { issuesApi } from "@/features/issues/api/issuesApi";
import { aiApi } from "@/features/issues/api/aiApi";
import { useProjectStore } from "@/stores/useProjectStore";
import { generateSuggestedKey } from "@/features/projects/utils/keyGenerator";
import type { AITriageResult } from "@/features/issues/types";
import type { Project } from "@/features/projects/types";

interface OnboardingFlowProps {
  onComplete: (project: Project) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  // Step 2: Paste a real bug
  const [bugText, setBugText] = useState("");
  const [triagePreview, setTriagePreview] = useState<AITriageResult | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  const [isSavingBug, setIsSavingBug] = useState(false);

  // Step 3: Invite link
  const [inviteLink, setInviteLink] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Step 4: GitHub webhook
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const createProject = useCreateProject();
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error("Give your project a name");
      return;
    }
    try {
      const normalizedKey = projectKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      const proj = await createProject.mutateAsync({
        name: projectName.trim(),
        ...(normalizedKey ? { key: normalizedKey } : {}),
      });
      setCreatedProject(proj);
      setCurrentProjectId(proj.id);
      setStep(2);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not create project");
    }
  };

  const handleRunLiveTriage = async () => {
    if (!createdProject || bugText.trim().length < 5) return;
    setIsTriaging(true);
    try {
      const res = await aiApi.triageIssue({
        projectId: createdProject.id,
        rawText: bugText.trim(),
      });
      setTriagePreview(res);
    } catch {
      toast.error("Could not auto-triage right now — you can still file the issue.");
    } finally {
      setIsTriaging(false);
    }
  };

  const handleSaveFirstBug = async () => {
    if (!createdProject) return;
    setIsSavingBug(true);
    try {
      const title =
        triagePreview?.title ||
        bugText.trim().split("\n")[0]?.slice(0, 100) ||
        "First tracked bug";
      await issuesApi.create(createdProject.id, {
        title,
        description: bugText.trim(),
        priority: triagePreview && triagePreview.confidence >= 0.6 ? triagePreview.priority : "medium",
        type: triagePreview?.type || "bug",
        severity: triagePreview?.severity || "minor",
        steps_to_reproduce: triagePreview?.steps_to_reproduce?.join("\n") || "",
        actual: triagePreview?.actual_behavior || "",
        status: "todo",
      });
      toast.success("First bug added to your project");
      const inv = await projectsApi.createInvite(createdProject.id, { role: "member" });
      setInviteLink(`${window.location.origin}/invite/${inv.token}`);
      setStep(3);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save issue");
    } finally {
      setIsSavingBug(false);
    }
  };

  const handleGoToInviteStep = async () => {
    if (createdProject && !inviteLink) {
      try {
        const inv = await projectsApi.createInvite(createdProject.id, { role: "member" });
        setInviteLink(`${window.location.origin}/invite/${inv.token}`);
      } catch {
        // Ignore if link creation deferred
      }
    }
    setStep(3);
  };

  const webhookUrl = createdProject
    ? `${window.location.origin}/api/v1/integrations/github/webhook/${createdProject.key}/`
    : "";

  return (
    <div
      className="mx-auto max-w-xl py-8 animate-in fade-in"
      data-testid="onboarding-flow"
    >
      <div className="mb-6 flex items-center justify-between text-xs text-text-muted">
        <span>Step {step} of 4 · Setup takes under 5 minutes</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((num) => (
            <span
              key={num}
              className={`h-1.5 w-8 rounded-full ${
                num <= step ? "bg-accent" : "bg-surface-elevated"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        {step === 1 && (
          <form onSubmit={handleCreateProject} className="space-y-5">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-text">
                Create your first project
              </h1>
              <p className="mt-1 text-xs text-text-muted">
                Just a name to get started. We&apos;ll generate your issue key automatically.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-project-name">Project name</Label>
                <Input
                  id="onboard-project-name"
                  value={projectName}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setProjectName(nextName);
                    if (!keyManuallyEdited) {
                      setProjectKey(nextName.trim() ? generateSuggestedKey(nextName) : "");
                    }
                  }}
                  placeholder="e.g. Billing API or Web App"
                  autoFocus
                  required
                />
              </div>

              {projectName.trim() && (
                <div className="space-y-1.5">
                  <Label htmlFor="onboard-project-key">
                    Project key <span className="font-normal text-text-muted">(editable)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="onboard-project-key"
                      value={projectKey}
                      onChange={(e) => {
                        setKeyManuallyEdited(true);
                        setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                      }}
                      placeholder={generateSuggestedKey(projectName)}
                      className="w-32 font-mono uppercase"
                      maxLength={10}
                    />
                    <span className="text-[11px] text-text-muted">
                      Issue keys will look like{" "}
                      <span className="font-mono font-semibold text-text">
                        {(projectKey || generateSuggestedKey(projectName))}-1
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createProject.isPending} className="gap-1.5">
                {createProject.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text">
                Paste a real bug you&apos;re dealing with
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Drop a Slack message, stack trace, or customer note — see BugSense structure it live.
              </p>
            </div>

            <textarea
              value={bugText}
              onChange={(e) => setBugText(e.target.value)}
              rows={4}
              placeholder="e.g. TypeError: Cannot read properties of undefined (reading 'map') on /invoices when billing period is empty"
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
              autoFocus
            />

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunLiveTriage}
                disabled={bugText.trim().length < 5 || isTriaging}
                className="gap-1.5"
              >
                {isTriaging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                )}
                Preview triage
              </Button>
              <button
                type="button"
                onClick={handleGoToInviteStep}
                className="text-xs text-text-muted hover:text-text"
              >
                Skip for now
              </button>
            </div>

            {triagePreview && (
              <div className="space-y-2 rounded-lg border border-accent/25 bg-accent/5 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{triagePreview.title}</span>
                  <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] uppercase text-text-muted">
                    {triagePreview.priority} · {triagePreview.type}
                  </span>
                </div>
                {triagePreview.missing_info && triagePreview.missing_info.length > 0 && (
                  <p className="text-[11px] text-text-muted">
                    Tip: Adding {triagePreview.missing_info.join(" and ")} would tighten this ticket.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleSaveFirstBug}
                disabled={!bugText.trim() || isSavingBug}
                className="gap-1.5"
              >
                {isSavingBug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Create first issue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text">Invite your team</h2>
              <p className="mt-1 text-xs text-text-muted">
                Share this link in Slack or Discord — teammates can join {createdProject?.name} in
                one click.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input value={inviteLink || "Generating invite link…"} readOnly className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!inviteLink) return;
                  navigator.clipboard?.writeText(inviteLink);
                  setCopiedInvite(true);
                  toast.success("Invite link copied");
                  setTimeout(() => setCopiedInvite(false), 2000);
                }}
                className="shrink-0 gap-1.5"
              >
                {copiedInvite ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                Copy link
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs text-text-muted hover:text-text"
              >
                I&apos;ll invite teammates later
              </button>
              <Button type="button" onClick={() => setStep(4)} className="gap-1.5">
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && createdProject && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <GitPullRequest className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-text">
                  Connect GitHub (optional)
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  Mention <span className="font-mono font-semibold">{createdProject.key}-1</span> in
                  a branch or PR title to move issues to In Review on open and Done on merge.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg border border-border bg-background/60 p-3">
              <p className="text-[11px] font-medium text-text-muted">Webhook URL</p>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="h-8 font-mono text-[11px]" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookUrl);
                    setCopiedWebhook(true);
                    toast.success("Webhook URL copied");
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                >
                  {copiedWebhook ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => onComplete(createdProject)}
                className="text-xs text-text-muted hover:text-text"
              >
                Skip for now
              </button>
              <Button type="button" onClick={() => onComplete(createdProject)}>
                Go to Today
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
