import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateIssue, useLabels } from "../hooks/useIssues";
import { issuesApi } from "../api/issuesApi";
import { useProjectMembers, useProjects } from "@/features/projects/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { AuthContext } from "@/features/auth/context/AuthContext";
import { DueDatePicker } from "@/components/common/DueDatePicker";
import { AIDuplicateBanner } from "./ai/AIDuplicateBanner";
import { useAITriage, useFindDuplicates } from "../hooks/useAI";
import { formatShortcut } from "@/lib/format";
import type {
  AIDuplicateCandidate,
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
  defaultStatus?: IssueStatus;
}

const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function CreateIssueModal({
  isOpen,
  onClose,
  onCreated,
  projectId,
  projectKey,
  defaultStatus,
}: CreateIssueModalProps) {
  const auth = useContext(AuthContext);
  const { data: projects = [] } = useProjects();
  const { getActiveProject } = useProjectStore();
  const activeProject = projects.find((p) => p.id === projectId) || getActiveProject(projects);
  const isNonTriager = Boolean(
    activeProject?.current_triager_id &&
      auth?.user?.id &&
      activeProject.current_triager_id !== auth.user.id
  );
  const resolvedDefaultDest: "todo" | "inbox" =
    defaultStatus === "inbox"
      ? "inbox"
      : defaultStatus === "todo"
        ? "todo"
        : isNonTriager
          ? "inbox"
          : "todo";

  const [rawPaste, setRawPaste] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<IssueType>("bug");
  // Blank string when AI confidence is low so user explicitly chooses or confirms Medium
  const [priority, setPriority] = useState<IssuePriority | "">("");
  const [severity, setSeverity] = useState<IssueSeverity>("minor");
  const [destination, setDestination] = useState<"todo" | "inbox">(resolvedDefaultDest);

  useEffect(() => {
    if (isOpen && !rawPaste && !title) {
      setDestination(resolvedDefaultDest);
    }
  }, [isOpen, resolvedDefaultDest, rawPaste, title]);
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [showRepro, setShowRepro] = useState(false);
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [environment, setEnvironment] = useState("");
  const [showReporter, setShowReporter] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [isBlockingRelease, setIsBlockingRelease] = useState(false);

  const [isDuplicateDismissed, setIsDuplicateDismissed] = useState(false);
  const [linkedDuplicate, setLinkedDuplicate] = useState<AIDuplicateCandidate | null>(null);
  const [triageResult, setTriageResult] = useState<AITriageResult | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previousDraft, setPreviousDraft] = useState<{
    title: string;
    type: IssueType;
    priority: IssuePriority | "";
    severity: IssueSeverity;
    stepsToReproduce: string;
    expected: string;
    actual: string;
    selectedLabels: string[];
  } | null>(null);

  const lastTriagedTextRef = useRef("");
  const pasteInputRef = useRef<HTMLTextAreaElement>(null);

  const { data: members = [] } = useProjectMembers(projectId);
  const { data: labels = [] } = useLabels(projectId);
  const createMutation = useCreateIssue(projectId);
  const triageMutation = useAITriage();

  const duplicateQueryText = title.trim() || rawPaste.trim().slice(0, 140);
  const { data: duplicates = [] } = useFindDuplicates(projectId, duplicateQueryText, rawPaste, {
    enabled: isOpen && !isDuplicateDismissed && duplicateQueryText.length >= 10,
    debounceMs: 600,
    threshold: 0.55,
  });

  const resetForm = useCallback(() => {
    setRawPaste("");
    setTitle("");
    setType("bug");
    setPriority("");
    setSeverity("minor");
    setDestination(resolvedDefaultDest);
    setAssigneeId("");
    setSelectedLabels([]);
    setDueDate("");
    setShowRepro(false);
    setStepsToReproduce("");
    setExpected("");
    setActual("");
    setEnvironment("");
    setShowReporter(false);
    setReporterName("");
    setReporterEmail("");
    setIsBlockingRelease(false);
    setIsDuplicateDismissed(false);
    setLinkedDuplicate(null);
    setTriageResult(null);
    setPreviousDraft(null);
    lastTriagedTextRef.current = "";
  }, [resolvedDefaultDest]);

  // Ensure modal opens clean and focuses the Paste anything field
  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        pasteInputRef.current?.focus();
      }, 30);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  const applyTriageResult = useCallback(
    (result: AITriageResult) => {
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
      setTriageResult(result);

      if (!title.trim() || title.trim() === previousDraft?.title || lastTriagedTextRef.current) {
        setTitle(result.title);
      }
      setType(result.type);
      setSeverity(result.severity);

      // Confidence handling: do NOT pre-fill priority below 60%; leave blank with a nudge
      if (result.confidence < LOW_CONFIDENCE_THRESHOLD) {
        setPriority("");
      } else {
        setPriority(result.priority);
      }

      if (result.steps_to_reproduce?.length) {
        setStepsToReproduce(result.steps_to_reproduce.join("\n"));
      }
      if (result.expected_behavior) {
        setExpected(result.expected_behavior);
      }
      if (result.actual_behavior) {
        setActual(result.actual_behavior);
      }
      if (result.suggested_labels?.length && labels.length) {
        const matchedIds = labels
          .filter((label) =>
            result.suggested_labels.some(
              (suggested) => suggested.trim().toLowerCase() === label.name.trim().toLowerCase()
            )
          )
          .map((label) => label.id);
        if (matchedIds.length) {
          setSelectedLabels((current) => Array.from(new Set([...current, ...matchedIds])));
        }
      }
    },
    [title, type, priority, severity, stepsToReproduce, expected, actual, selectedLabels, labels, previousDraft?.title]
  );

  const runTriage = useCallback(
    async (text: string) => {
      const cleaned = text.trim();
      if (cleaned.length < 10 || !projectId || triageMutation.isPending) return;
      lastTriagedTextRef.current = cleaned;
      try {
        const res = await triageMutation.mutateAsync({
          projectId,
          rawText: cleaned,
        });
        applyTriageResult(res);
      } catch {
        // Error surfaced inline without blocking manual issue creation
      }
    },
    [projectId, triageMutation, applyTriageResult]
  );

  // Automatic triage ~1 second after pasting or typing into "Paste anything"
  useEffect(() => {
    if (!isOpen) return;
    const cleaned = rawPaste.trim();
    if (cleaned.length < 15 || cleaned === lastTriagedTextRef.current) return;

    const timer = window.setTimeout(() => {
      runTriage(cleaned);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [isOpen, rawPaste, runTriage]);

  // Keyboard shortcuts inside Capture: Cmd/Ctrl+J to re-run triage, Cmd/Ctrl+Enter to create
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        if (rawPaste.trim().length >= 5) {
          runTriage(rawPaste);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, rawPaste, runTriage]);

  const handlePasteImage = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((it) => it.type.startsWith("image/"));
    if (!imageItem || !projectId) return;

    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    setIsUploadingImage(true);
    try {
      const uploaded = await issuesApi.uploadAttachment(projectId, file);
      const snippet = `\n![${uploaded.filename}](${uploaded.url})\n`;
      setRawPaste((prev) => `${prev}${snippet}`.trimStart());
      toast.success("Screenshot attached");
    } catch {
      toast.error("Could not upload pasted screenshot");
    } finally {
      setIsUploadingImage(false);
    }
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
    setTriageResult(null);
    setPreviousDraft(null);
  };

  const submitIssue = async (addAnother: boolean) => {
    const effectiveTitle =
      title.trim() ||
      rawPaste
        .trim()
        .split("\n")[0]
        ?.slice(0, 100) ||
      "";
    if (!effectiveTitle) {
      toast.error("Paste a bug report or enter a title first.");
      return;
    }

    // If low-confidence left priority blank, prompt clearly unless user picks one
    const finalPriority: IssuePriority = priority || "medium";

    try {
      const created = await createMutation.mutateAsync({
        title: effectiveTitle,
        description: rawPaste.trim(),
        type,
        priority: finalPriority,
        severity,
        status: destination,
        assignee_id: assigneeId || null,
        label_ids: selectedLabels,
        due_date: dueDate || null,
        steps_to_reproduce: stepsToReproduce.trim(),
        expected: expected.trim(),
        actual: actual.trim(),
        environment: environment.trim(),
        external_reporter_name: reporterName.trim(),
        external_reporter_email: reporterEmail.trim(),
        is_blocking_release: isBlockingRelease,
        duplicate_of_id: linkedDuplicate?.id || null,
      });

      toast.success(`Created ${created.key}`);
      resetForm();

      if (addAnother) {
        window.setTimeout(() => pasteInputRef.current?.focus(), 30);
      } else {
        onClose();
        onCreated?.(created);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create issue");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitIssue(false);
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submitIssue(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((current) =>
      current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId]
    );
  };

  const isLowConfidence = Boolean(
    triageResult && triageResult.confidence < LOW_CONFIDENCE_THRESHOLD
  );
  const missingHints = triageResult?.missing_info?.length
    ? triageResult.missing_info.join(" and ")
    : "browser and steps";

  const reproCount = [stepsToReproduce, expected, actual, environment].filter((v) =>
    v.trim()
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Capture bug"
      description="Paste a stack trace, Slack message, or screenshot. Fields fill automatically."
      className="max-h-[92vh] max-w-2xl overflow-y-auto"
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        autoComplete="off"
        className="space-y-4"
        data-testid="create-issue-form"
      >
        {/* Giant Paste Anything Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="capture-raw-paste" className="text-xs font-medium text-text">
              Paste anything
            </Label>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              {triageMutation.isPending && (
                <span className="inline-flex items-center gap-1 text-accent">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Triaging report…
                </span>
              )}
              {isUploadingImage && (
                <span className="inline-flex items-center gap-1 text-accent">
                  <ImagePlus className="h-3 w-3" />
                  Uploading screenshot…
                </span>
              )}
              {previousDraft && (
                <button
                  type="button"
                  onClick={handleUndoTriage}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-text-muted hover:bg-surface-elevated hover:text-text"
                  data-testid="ai-undo-button"
                >
                  <RotateCcw className="h-3 w-3" />
                  Undo auto-fill
                </button>
              )}
              <button
                type="button"
                onClick={() => runTriage(rawPaste)}
                disabled={rawPaste.trim().length < 5 || triageMutation.isPending}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
                data-testid="ai-autofill-button"
              >
                <Sparkles className="h-3 w-3" />
                Auto-fill
              </button>
            </div>
          </div>

          <textarea
            ref={pasteInputRef}
            id="capture-raw-paste"
            value={rawPaste}
            onChange={(e) => setRawPaste(e.target.value)}
            onPaste={handlePasteImage}
            placeholder={`Paste a stack trace, Slack thread, customer email, or screenshot (${formatShortcut("V")})…`}
            rows={4}
            autoFocus
            className="w-full rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
            data-testid="ai-triage-raw-input"
          />

          {!rawPaste.trim() && !triageResult && (
            <p className="text-[11px] text-text-muted" data-testid="capture-capability-strip">
              Auto-triages stack traces &amp; emails · Checks title &amp; body duplicates · Paste
              screenshots ({formatShortcut("V")}) · Guides when context is missing
            </p>
          )}

          {/* Confidence / Missing Context Guidance (never bare percentage) */}
          {triageResult && (
            <div
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                isLowConfidence
                  ? "border-warning/35 bg-warning/10 text-text"
                  : "border-accent/25 bg-accent/5 text-text"
              }`}
              data-testid="ai-confidence-chip"
            >
              <div className="flex items-start gap-2">
                <Sparkles
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    isLowConfidence ? "text-warning" : "text-accent"
                  }`}
                />
                <span>
                  {isLowConfidence ? (
                    <>
                      <strong>Needs more context:</strong> Add the {missingHints} to improve this.
                    </>
                  ) : (
                    <>
                      <strong>Fields auto-filled</strong>
                      {triageResult.reasoning ? ` · ${triageResult.reasoning}` : ""}
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {triageResult?.possible_root_cause && (
            <p
              className="rounded-md border border-border bg-surface-elevated/60 px-2.5 py-1.5 text-[11px] text-text-muted"
              data-testid="ai-root-cause-hint"
            >
              <strong className="text-text">Possible cause:</strong>{" "}
              {triageResult.possible_root_cause}
            </p>
          )}
        </div>

        {/* Inline Duplicate Check */}
        {!isDuplicateDismissed && duplicates.length > 0 && (
          <AIDuplicateBanner
            candidates={duplicates}
            linkedDuplicate={linkedDuplicate}
            onSelectDuplicate={(cand) => {
              setLinkedDuplicate(cand);
              toast.success(`Linked to ${cand.key}`);
            }}
            onDismiss={() => {
              setLinkedDuplicate(null);
              setIsDuplicateDismissed(true);
            }}
            projectKey={projectKey}
          />
        )}

        {/* Live-Filling Title */}
        <div className="space-y-1">
          <Label htmlFor="capture-title" className="text-xs font-medium text-text">
            Title <span className="text-danger">*</span>
          </Label>
          <Input
            id="capture-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Human-readable summary (auto-fills from report)"
            autoComplete="off"
            className="h-9 bg-background text-sm"
            data-testid="create-issue-title-input"
          />
        </div>

        {/* Inline Editable Fields Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="capture-type" className="text-[11px] text-text-muted">
              Type
            </Label>
            <select
              id="capture-type"
              value={type}
              onChange={(e) => setType(e.target.value as IssueType)}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-text focus:border-accent focus:outline-none"
              data-testid="create-issue-type-select"
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="task">Task</option>
              <option value="improvement">Improvement</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="capture-priority" className="text-[11px] text-text-muted">
              Priority
            </Label>
            <select
              id="capture-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as IssuePriority | "")}
              className={`h-8 w-full rounded-md border bg-background px-2 text-xs text-text focus:border-accent focus:outline-none ${
                priority === "" ? "border-warning/60" : "border-border"
              }`}
              data-testid="create-issue-priority-select"
            >
              {priority === "" && <option value="">Pick priority…</option>}
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            {priority === "" && (
              <p className="text-[10px] text-warning" data-testid="priority-low-confidence-nudge">
                Pick priority (defaults to Medium)
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="capture-assignee" className="text-[11px] text-text-muted">
              Assignee
            </Label>
            <select
              id="capture-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              autoComplete="off"
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-text focus:border-accent focus:outline-none"
              data-testid="create-issue-assignee-select"
            >
              <option value="">Leave unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.user.id}>
                  {m.user.full_name || m.user.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="capture-destination" className="text-[11px] text-text-muted">
              Route to
            </Label>
            <select
              id="capture-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value as "todo" | "inbox")}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-text focus:border-accent focus:outline-none"
            >
              <option value="todo">Todo (Ready)</option>
              <option value="inbox">Inbox (Needs triage)</option>
            </select>
            {isNonTriager && activeProject?.current_triager && (
              <p className="text-[10px] text-text-muted">
                Defaulted to Inbox (Triager: {activeProject.current_triager.full_name})
              </p>
            )}
          </div>
        </div>

        {/* Suggested Assignee 1-Click Chip (never auto-selected silently) */}
        {triageResult?.suggested_assignee &&
          assigneeId !== triageResult.suggested_assignee.id && (
            <div className="flex items-center justify-between rounded-md border border-border bg-surface-elevated/50 px-2.5 py-1.5 text-xs">
              <span className="flex items-center gap-1.5 text-text-muted">
                <UserCheck className="h-3.5 w-3.5 text-accent" />
                Suggested owner:{" "}
                <strong className="text-text">{triageResult.suggested_assignee.full_name}</strong>
                <span className="hidden text-[11px] sm:inline">
                  ({triageResult.suggested_assignee.reason})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setAssigneeId(triageResult.suggested_assignee!.id)}
                className="rounded bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20"
                data-testid="apply-suggested-assignee"
              >
                Assign
              </button>
            </div>
          )}

        {/* Labels + Due date + Blocking release */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {labels.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {labels.map((label) => {
                const selected = selectedLabels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    aria-pressed={selected}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
                    style={{
                      borderColor: selected ? label.color : "hsl(var(--border))",
                      backgroundColor: selected ? `${label.color}20` : "transparent",
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
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-text-muted">
              <input
                type="checkbox"
                checked={isBlockingRelease}
                onChange={(e) => setIsBlockingRelease(e.target.checked)}
                className="rounded border-border text-danger focus:ring-danger"
              />
              <span>Blocking release</span>
            </label>

            <DueDatePicker
              compact
              id="create-issue-due-date"
              value={dueDate}
              onChange={setDueDate}
              testId="create-issue-due-date"
            />
          </div>
        </div>

        {/* Collapsed Reproduction Details & Optional Reporter */}
        <div className="flex flex-wrap items-center gap-4 border-t border-border/60 pt-2.5">
          <button
            type="button"
            onClick={() => setShowRepro((v) => !v)}
            aria-expanded={showRepro}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            {showRepro ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Reproduction details{reproCount > 0 ? ` (${reproCount} filled)` : ""}
          </button>

          <button
            type="button"
            onClick={() => setShowReporter((v) => !v)}
            aria-expanded={showReporter}
            className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text"
          >
            {showReporter ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Who reported this?
          </button>
        </div>

        {showRepro && (
          <div className="space-y-2.5 rounded-lg border border-border bg-background/50 p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="steps-input" className="text-[11px] text-text-muted">
                  Steps to reproduce
                </Label>
                <textarea
                  id="steps-input"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  rows={2}
                  placeholder="1. Open… 2. Click…"
                  className="w-full rounded-md border border-border bg-background p-2 text-xs text-text focus:border-accent focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="environment-input" className="text-[11px] text-text-muted">
                  Browser / Environment
                </Label>
                <Input
                  id="environment-input"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="e.g. Chrome 129, macOS"
                  className="h-8 bg-background text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="expected-input" className="text-[11px] text-text-muted">
                  Expected
                </Label>
                <Input
                  id="expected-input"
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  placeholder="What should happen"
                  className="h-8 bg-background text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="actual-input" className="text-[11px] text-text-muted">
                  Actual
                </Label>
                <Input
                  id="actual-input"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="What actually happened"
                  className="h-8 bg-background text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {showReporter && (
          <div className="grid grid-cols-1 gap-2.5 rounded-lg border border-border bg-background/50 p-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="reporter-name" className="text-[11px] text-text-muted">
                Reporter name (optional)
              </Label>
              <Input
                id="reporter-name"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="e.g. Sarah from QA"
                className="h-8 bg-background text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reporter-email" className="text-[11px] text-text-muted">
                Reporter email (notify when fixed)
              </Label>
              <Input
                id="reporter-email"
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="sarah@customer.com"
                className="h-8 bg-background text-xs"
              />
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={createMutation.isPending || (!title.trim() && !rawPaste.trim())}
              onClick={() => submitIssue(true)}
              data-testid="submit-and-add-another-btn"
            >
              Create and add another
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || (!title.trim() && !rawPaste.trim())}
              data-testid="submit-issue-btn"
            >
              {createMutation.isPending
                ? "Creating…"
                : `Create (${formatShortcut("Enter")})`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
