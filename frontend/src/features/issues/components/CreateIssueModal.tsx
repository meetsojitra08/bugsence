import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateIssue, useLabels } from "../hooks/useIssues";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { AITriageCard } from "./ai/AITriageCard";
import { AIDuplicateBanner } from "./ai/AIDuplicateBanner";
import { useFindDuplicates } from "../hooks/useAI";
import type {
  AITriageResult,
  IssueDetail,
  IssuePriority,
  IssueSeverity,
  IssueStatus,
  IssueType,
} from "../types";

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (issue: IssueDetail) => void;
  projectId: string;
  projectKey?: string;
}

export function CreateIssueModal({
  isOpen,
  onClose,
  onCreated,
  projectId,
  projectKey,
}: CreateIssueModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<IssueType>("bug");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [severity, setSeverity] = useState<IssueSeverity>("minor");
  const status: IssueStatus = "todo";
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [environment, setEnvironment] = useState("");
  const [isDuplicateDismissed, setIsDuplicateDismissed] = useState(false);
  const [previousDraft, setPreviousDraft] = useState<{
    title: string;
    type: IssueType;
    priority: IssuePriority;
    severity: IssueSeverity;
    stepsToReproduce: string;
    expected: string;
    actual: string;
    selectedLabels: string[];
  } | null>(null);

  const { data: members = [] } = useProjectMembers(projectId);
  const { data: labels = [] } = useLabels(projectId);
  const createMutation = useCreateIssue(projectId);
  const { data: duplicates = [] } = useFindDuplicates(projectId, title, description, {
    enabled: !isDuplicateDismissed && title.trim().length >= 10,
  });

  const handleTriageApplied = (result: AITriageResult) => {
    setPreviousDraft({
      title,
      type,
      priority,
      severity,
      stepsToReproduce,
      expected,
      actual,
      selectedLabels,
    });
    setTitle(result.title);
    setType(result.type);
    setPriority(result.priority);
    setSeverity(result.severity);

    if (result.steps_to_reproduce?.length) {
      setStepsToReproduce(result.steps_to_reproduce.join("\n"));
      setShowDetails(true);
    }
    if (result.expected_behavior) {
      setExpected(result.expected_behavior);
      setShowDetails(true);
    }
    if (result.actual_behavior) {
      setActual(result.actual_behavior);
      setShowDetails(true);
    }
    if (result.suggested_labels?.length && labels.length) {
      const matchedIds = labels
        .filter((label) =>
          result.suggested_labels.some(
            (suggested) => suggested.trim().toLowerCase() === label.name.trim().toLowerCase()
          )
        )
        .map((label) => label.id);
      if (matchedIds.length)
        setSelectedLabels((current) => Array.from(new Set([...current, ...matchedIds])));
    }
    toast.success("Suggestions added. Review them before saving.");
  };

  const handleUndoTriage = () => {
    if (!previousDraft) return;
    setTitle(previousDraft.title);
    setType(previousDraft.type);
    setPriority(previousDraft.priority);
    setSeverity(previousDraft.severity);
    setStepsToReproduce(previousDraft.stepsToReproduce);
    setExpected(previousDraft.expected);
    setActual(previousDraft.actual);
    setSelectedLabels(previousDraft.selectedLabels);
    setPreviousDraft(null);
    toast.info("Reverted AI suggestions");
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStep(1);
    setType("bug");
    setPriority("medium");
    setSeverity("minor");
    setAssigneeId("");
    setSelectedLabels([]);
    setDueDate("");
    setShowDetails(false);
    setStepsToReproduce("");
    setExpected("");
    setActual("");
    setEnvironment("");
    setIsDuplicateDismissed(false);
    setPreviousDraft(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step === 1) {
      if (!title.trim()) {
        toast.error("Add an issue title before continuing.");
        return;
      }
      setStep(2);
      return;
    }
    if (!title.trim()) {
      toast.error("Add an issue title before creating it.");
      setStep(1);
      return;
    }

    try {
      const createdIssue = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        severity,
        status,
        assignee_id: assigneeId || null,
        label_ids: selectedLabels,
        due_date: dueDate || null,
        steps_to_reproduce: stepsToReproduce.trim(),
        expected: expected.trim(),
        actual: actual.trim(),
        environment: environment.trim(),
      });
      toast.success(`Created ${createdIssue.key}`);
      resetForm();
      onClose();
      onCreated?.(createdIssue);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create issue");
    }
  };

  const handleClose = () => onClose();
  const handleCancel = () => {
    resetForm();
    onClose();
  };
  const toggleLabel = (labelId: string) => {
    setSelectedLabels((current) =>
      current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create an issue"
      description="Capture the report first. Review and route it before it enters the board."
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      <div className="space-y-5">
        <ol aria-label="Issue creation steps" className="grid grid-cols-2 gap-2">
          {[
            { number: 1, title: "Report", subtitle: "Capture and triage" },
            { number: 2, title: "Review", subtitle: "Assign and create" },
          ].map((item) => {
            const current = step === item.number;
            const complete = step > item.number;
            return (
              <li
                key={item.number}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${current ? "border-accent/40 bg-accent/10" : complete ? "border-success/30 bg-success/5" : "border-border bg-background/40"}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${current ? "bg-accent text-white" : complete ? "bg-success/15 text-success" : "bg-surface-elevated text-text-muted"}`}
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : item.number}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-text">{item.title}</span>
                  <span className="block text-[10px] text-text-muted">{item.subtitle}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-issue-form">
          {step === 1 ? (
            <section aria-labelledby="issue-report-heading" className="space-y-4">
              <div>
                <h3 id="issue-report-heading" className="text-sm font-semibold text-text">
                  Start with the report
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  Paste a QA note, customer report, or error log. AI suggestions are optional and
                  editable.
                </p>
              </div>

              <AITriageCard
                projectId={projectId}
                report={description}
                onReportChange={setDescription}
                onTriageApplied={handleTriageApplied}
                onUndo={handleUndoTriage}
                canUndo={!!previousDraft}
              />

              <div className="space-y-1.5">
                <Label htmlFor="issue-title" className="text-xs font-medium text-text">
                  Issue title <span className="text-danger">*</span>
                </Label>
                <Input
                  id="issue-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Summarize the problem in one line"
                  autoFocus
                  required
                  className="h-10 bg-background text-sm"
                  data-testid="create-issue-title-input"
                />
                <p className="text-[11px] text-text-muted">
                  AI suggestions can be reviewed and changed before saving.
                </p>
              </div>

              {!isDuplicateDismissed && duplicates.length > 0 && (
                <AIDuplicateBanner
                  candidates={duplicates}
                  onDismiss={() => setIsDuplicateDismissed(true)}
                  projectKey={projectKey}
                />
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="issue-type" className="text-xs font-medium text-text-muted">
                    Type
                  </Label>
                  <select
                    id="issue-type"
                    value={type}
                    onChange={(event) => setType(event.target.value as IssueType)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text focus:border-accent focus:outline-none"
                    data-testid="create-issue-type-select"
                  >
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="task">Task</option>
                    <option value="improvement">Improvement</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="issue-priority" className="text-xs font-medium text-text-muted">
                    Priority
                  </Label>
                  <select
                    id="issue-priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as IssuePriority)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text focus:border-accent focus:outline-none"
                    data-testid="create-issue-priority-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="issue-severity" className="text-xs font-medium text-text-muted">
                    Severity
                  </Label>
                  <select
                    id="issue-severity"
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value as IssueSeverity)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text focus:border-accent focus:outline-none"
                  >
                    <option value="trivial">Trivial</option>
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {description.trim() && (
                <div className="flex items-start gap-2 rounded-lg border border-border bg-background/50 p-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-text">
                      Original report will be saved with the issue
                    </p>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-text-muted">
                      {description}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!title.trim()}
                  onClick={() => setStep(2)}
                  className="gap-1.5"
                >
                  Review issue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </section>
          ) : (
            <section aria-labelledby="issue-review-heading" className="space-y-4">
              <div>
                <h3 id="issue-review-heading" className="text-sm font-semibold text-text">
                  Review and route
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  Confirm the report, assign an owner, and add any extra reproduction context.
                </p>
              </div>

              {description.trim() && (
                <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium text-text">Original report</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[11px] font-medium text-accent hover:underline"
                    >
                      Edit report
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-text-muted">
                    {description}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="review-issue-title" className="text-xs font-medium text-text">
                  Issue title <span className="text-danger">*</span>
                </Label>
                <Input
                  id="review-issue-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  className="h-9 bg-background text-sm"
                  data-testid="create-issue-title-input"
                />
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-text-muted">
                  {type}
                </span>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-text-muted">
                  {priority} priority
                </span>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-text-muted">
                  {severity} severity
                </span>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-text-muted">
                  Starts in To do
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="font-medium text-accent hover:underline"
                >
                  Edit triage
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="issue-assignee" className="text-xs font-medium text-text-muted">
                    Assignee <span className="font-normal">(optional)</span>
                  </Label>
                  <select
                    id="issue-assignee"
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text focus:border-accent focus:outline-none"
                  >
                    <option value="">Leave unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.user.id}>
                        {member.user.full_name} ({member.user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="issue-due-date" className="text-xs font-medium text-text-muted">
                    Due date <span className="font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="issue-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="h-9 bg-background text-xs"
                  />
                </div>
              </div>

              {labels.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-muted">
                    Labels <span className="font-normal">(optional)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((label) => {
                      const selected = selectedLabels.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => toggleLabel(label.id)}
                          aria-pressed={selected}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-all"
                          style={{
                            borderColor: selected ? label.color : "hsl(var(--border))",
                            backgroundColor: selected ? `${label.color}22` : "transparent",
                            color: selected ? label.color : "hsl(var(--text-muted))",
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  aria-expanded={showDetails}
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  {showDetails ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {showDetails
                    ? "Hide reproduction details"
                    : "Add reproduction steps and environment"}
                </button>
                {showDetails && (
                  <div className="mt-3 space-y-3 rounded-lg border border-border bg-background/40 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor="steps-input"
                          className="text-xs font-medium text-text-muted"
                        >
                          Steps to reproduce
                        </Label>
                        <textarea
                          id="steps-input"
                          value={stepsToReproduce}
                          onChange={(event) => setStepsToReproduce(event.target.value)}
                          placeholder={"1. Go to…\n2. Click…"}
                          rows={3}
                          className="w-full rounded-lg border border-border bg-background p-2 text-xs text-text focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="environment-input"
                          className="text-xs font-medium text-text-muted"
                        >
                          Environment
                        </Label>
                        <Input
                          id="environment-input"
                          value={environment}
                          onChange={(event) => setEnvironment(event.target.value)}
                          placeholder="OS, browser, device…"
                          className="h-9 bg-background text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor="expected-input"
                          className="text-xs font-medium text-text-muted"
                        >
                          Expected behavior
                        </Label>
                        <textarea
                          id="expected-input"
                          value={expected}
                          onChange={(event) => setExpected(event.target.value)}
                          placeholder="What should happen?"
                          rows={2}
                          className="w-full rounded-lg border border-border bg-background p-2 text-xs text-text focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="actual-input"
                          className="text-xs font-medium text-text-muted"
                        >
                          Actual behavior
                        </Label>
                        <textarea
                          id="actual-input"
                          value={actual}
                          onChange={(event) => setActual(event.target.value)}
                          placeholder="What actually happens?"
                          rows={2}
                          className="w-full rounded-lg border border-border bg-background p-2 text-xs text-text focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to report
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending || !title.trim()}
                  data-testid="submit-issue-btn"
                >
                  {createMutation.isPending ? "Creating issue…" : "Create issue"}
                </Button>
              </div>
            </section>
          )}
        </form>
      </div>
    </Modal>
  );
}
