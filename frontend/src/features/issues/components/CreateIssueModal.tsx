import React, { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Eye, Edit3 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateIssue, useLabels } from "../hooks/useIssues";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { SafeMarkdown } from "../utils/markdown";
import { AITriageCard } from "./ai/AITriageCard";
import { AIDuplicateBanner } from "./ai/AIDuplicateBanner";
import { useFindDuplicates } from "../hooks/useAI";
import type { AITriageResult, IssuePriority, IssueSeverity, IssueStatus, IssueType } from "../types";

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectKey?: string;
}

export function CreateIssueModal({ isOpen, onClose, projectId, projectKey }: CreateIssueModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [type, setType] = useState<IssueType>("bug");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [severity, setSeverity] = useState<IssueSeverity>("minor");
  const [status, setStatus] = useState<IssueStatus>("todo");
  const [assigneeId, setAssigneeId] = useState<string>("");
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

  // Debounced duplicate search
  const { data: duplicates = [] } = useFindDuplicates(projectId, title, description, {
    enabled: !isDuplicateDismissed && title.trim().length >= 10,
  });

  const handleTriageApplied = (result: AITriageResult) => {
    // Save draft for undo
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

    if (result.steps_to_reproduce && result.steps_to_reproduce.length > 0) {
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

    // Match suggested labels to existing project labels
    if (result.suggested_labels && result.suggested_labels.length > 0 && labels.length > 0) {
      const matchedIds = labels
        .filter((l) =>
          result.suggested_labels.some(
            (sl) => sl.toLowerCase().trim() === l.name.toLowerCase().trim()
          )
        )
        .map((l) => l.id);
      if (matchedIds.length > 0) {
        setSelectedLabels((prev) => Array.from(new Set([...prev, ...matchedIds])));
      }
    }

    toast.success("AI triage applied to issue fields");
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
    toast.info("Reverted AI triage suggestions");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Issue title is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
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

      toast.success("Issue created successfully");
      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create issue";
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIsPreviewMode(false);
    setType("bug");
    setPriority("medium");
    setSeverity("minor");
    setStatus("todo");
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

  // Closing via Escape or the backdrop keeps the draft so an accidental dismissal
  // never destroys a half-written report. Cancel and successful submit reset explicitly.
  const handleClose = () => {
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Issue"
      description="Report a bug, assign tasks, or request a feature."
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      <div className="space-y-4">
        {/* AI Smart Triage Assistant */}
        <AITriageCard
          projectId={projectId}
          onTriageApplied={handleTriageApplied}
          onUndo={handleUndoTriage}
          canUndo={!!previousDraft}
        />

        {/* Duplicate Issue Warning Banner */}
        {!isDuplicateDismissed && duplicates.length > 0 && (
          <AIDuplicateBanner
            candidates={duplicates}
            onDismiss={() => setIsDuplicateDismissed(true)}
            projectKey={projectKey}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-issue-form">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="issue-title" className="text-xs font-medium text-text">
            Title <span className="text-danger">*</span>
          </Label>
          <Input
            id="issue-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's the issue or task?"
            autoFocus
            required
            className="h-9 bg-background text-sm"
            data-testid="create-issue-title-input"
          />
        </div>

        {/* Row 1: Type, Priority, Status */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="issue-type" className="text-xs font-medium text-text-muted">
              Type
            </Label>
            <select
              id="issue-type"
              value={type}
              onChange={(e) => setType(e.target.value as IssueType)}
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
              onChange={(e) => setPriority(e.target.value as IssuePriority)}
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
            <Label htmlFor="issue-status" className="text-xs font-medium text-text-muted">
              Status
            </Label>
            <select
              id="issue-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text focus:border-accent focus:outline-none"
              data-testid="create-issue-status-select"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="backlog">Backlog</option>
              <option value="done">Done</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Row 2: Assignee, Due Date */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="issue-assignee" className="text-xs font-medium text-text-muted">
              Assignee
            </Label>
            <select
              id="issue-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text focus:border-accent focus:outline-none"
              data-testid="create-issue-assignee-select"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.user.id}>
                  {m.user.full_name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="issue-due-date" className="text-xs font-medium text-text-muted">
              Due Date
            </Label>
            <Input
              id="issue-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 bg-background text-xs"
            />
          </div>
        </div>

        {/* Labels Selection */}
        {labels.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-text-muted">Labels</Label>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((lbl) => {
                const isSelected = selectedLabels.includes(lbl.id);
                return (
                  <button
                    key={lbl.id}
                    type="button"
                    onClick={() => toggleLabel(lbl.id)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-all"
                    style={{
                      borderColor: isSelected ? lbl.color : "hsl(var(--border))",
                      backgroundColor: isSelected ? `${lbl.color}22` : "transparent",
                      color: isSelected ? lbl.color : "hsl(var(--text-muted))",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: lbl.color }}
                    />
                    {lbl.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Description with Markdown Tabs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="issue-description" className="text-xs font-medium text-text-muted">
              Description (Markdown supported)
            </Label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                  !isPreviewMode ? "bg-accent/10 text-accent" : "text-text-muted hover:text-text"
                }`}
              >
                <Edit3 className="h-3 w-3" />
                Write
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewMode(true)}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                  isPreviewMode ? "bg-accent/10 text-accent" : "text-text-muted hover:text-text"
                }`}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>
          </div>

          {!isPreviewMode ? (
            <textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description, context, or expected outcome..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
              data-testid="create-issue-description-input"
            />
          ) : (
            <div className="min-h-[96px] rounded-lg border border-border bg-background/50 p-2.5 text-xs">
              {description ? (
                <SafeMarkdown content={description} />
              ) : (
                <span className="italic text-text-muted">Nothing to preview</span>
              )}
            </div>
          )}
        </div>

        {/* Expandable Details: Reproduction Steps, Environment */}
        <div className="border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            {showDetails ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            <span>
              {showDetails
                ? "Hide bug details"
                : "Add reproduction steps, expected/actual, environment"}
            </span>
          </button>

          {showDetails && (
            <div className="mt-3 space-y-3 rounded-lg border border-border bg-background/40 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="steps-input" className="text-xs font-medium text-text-muted">
                    Steps to Reproduce
                  </Label>
                  <textarea
                    id="steps-input"
                    value={stepsToReproduce}
                    onChange={(e) => setStepsToReproduce(e.target.value)}
                    placeholder="1. Go to...\n2. Click..."
                    rows={2}
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
                    onChange={(e) => setEnvironment(e.target.value)}
                    placeholder="OS, browser version, device..."
                    className="h-9 bg-background text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="expected-input" className="text-xs font-medium text-text-muted">
                    Expected Behavior
                  </Label>
                  <textarea
                    id="expected-input"
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    placeholder="What should happen?"
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs text-text focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="actual-input" className="text-xs font-medium text-text-muted">
                    Actual Behavior
                  </Label>
                  <textarea
                    id="actual-input"
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    placeholder="What actually happens?"
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs text-text focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 border-t border-border pt-4">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending}
            data-testid="submit-issue-btn"
          >
            {createMutation.isPending ? "Creating..." : "Create Issue"}
          </Button>
        </div>
      </form>
    </div>
  </Modal>
);
}
