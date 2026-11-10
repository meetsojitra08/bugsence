import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  GitMerge,
  Inbox as InboxIcon,
  Mail,
  MessageSquare,
  Radio,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { useProjectStore } from "@/stores/useProjectStore";
import { useProjectMembers, useProjects } from "@/features/projects/hooks/useProjects";
import { useInbox, useTriageInbox } from "../hooks/useIssues";
import { useUiStore } from "@/stores/useUiStore";
import { SafeMarkdown } from "../utils/markdown";
import { PriorityIcon } from "../components/PriorityIcon";
import { daysSince, formatRelativeAge, formatTimeAgo, pluralize } from "@/lib/format";
import type { AIDuplicateCandidate, IssueListItem, IssueSource } from "../types";

const SOURCE_BADGES: Record<IssueSource, { label: string; icon: React.ReactNode }> = {
  slack: { label: "Slack", icon: <MessageSquare className="h-3 w-3" /> },
  email: { label: "Email", icon: <Mail className="h-3 w-3" /> },
  sentry: { label: "Sentry", icon: <Radio className="h-3 w-3" /> },
  public_form: { label: "Form", icon: <InboxIcon className="h-3 w-3" /> },
  manual: { label: "Manual", icon: <InboxIcon className="h-3 w-3" /> },
};

export function InboxPage() {
  const { data: projects = [] } = useProjects();
  const { getActiveProject } = useProjectStore();
  const activeProject = getActiveProject(projects);
  const { openCaptureModal } = useUiStore();

  const [includeSnoozed, setIncludeSnoozed] = useState(false);
  const { data: items = [], isLoading } = useInbox(activeProject?.id || null, includeSnoozed);
  const { data: members = [] } = useProjectMembers(activeProject?.id || null);
  const triageMutation = useTriageInbox(activeProject?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);

  // Keep selected item valid as items are triaged
  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      setMobileDetailOpen(false);
      return;
    }
    if (!selectedId || !items.some((i) => i.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selectedIndex = items.findIndex((i) => i.id === selectedId);
  const selectedItem: IssueListItem | null =
    selectedIndex >= 0 ? items[selectedIndex] : (items[0] ?? null);

  const aiMeta = (selectedItem?.ai_metadata || {}) as {
    possible_duplicates?: AIDuplicateCandidate[];
    suggested_assignee?: { id: string; full_name: string; email: string; reason: string };
    suggested_type?: string;
    suggested_priority?: string;
    suggested_labels?: string[];
    triage_confidence?: number;
    triage_reasoning?: string;
    missing_info?: string[];
  };
  const topDuplicate = aiMeta.possible_duplicates?.[0] ?? null;
  const suggestedPerson = aiMeta.suggested_assignee ?? null;

  const advanceSelection = useCallback(
    (triagedId: string) => {
      const idx = items.findIndex((i) => i.id === triagedId);
      const next = items[idx + 1] ?? items[idx - 1] ?? null;
      setSelectedId(next?.id ?? null);
      if (!next) setMobileDetailOpen(false);
    },
    [items]
  );

  const handleTriage = useCallback(
    async (
      action: "accept" | "assign" | "merge" | "snooze" | "reject",
      opts?: { assigneeId?: string; targetIssueId?: string }
    ) => {
      if (!selectedItem) return;
      try {
        await triageMutation.mutateAsync({
          issueId: selectedItem.id,
          payload: {
            action,
            assignee_id: opts?.assigneeId,
            target_issue_id: opts?.targetIssueId,
            snooze_hours: 24,
          },
        });
        const labels = {
          accept: "Accepted to Todo",
          assign: "Assigned & moved to Todo",
          merge: "Merged as duplicate",
          snooze: "Snoozed for 24h",
          reject: "Closed as won't fix",
        };
        toast.success(`${selectedItem.key}: ${labels[action]}`);
        setAssignPickerOpen(false);
        advanceSelection(selectedItem.id);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Could not triage report");
      }
    },
    [selectedItem, triageMutation, advanceSelection]
  );

  // Keyboard flow: J/K move, E accept, A assign, M merge, X reject
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (isEditing || e.metaKey || e.ctrlKey || e.altKey || items.length === 0) return;

      const k = e.key.toLowerCase();
      if (k === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = Math.min(items.length - 1, Math.max(0, selectedIndex + 1));
        setSelectedId(items[nextIdx].id);
      } else if (k === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const prevIdx = Math.max(0, selectedIndex - 1);
        setSelectedId(items[prevIdx].id);
      } else if (k === "e") {
        e.preventDefault();
        handleTriage("accept");
      } else if (k === "a") {
        e.preventDefault();
        if (suggestedPerson) {
          handleTriage("assign", { assigneeId: suggestedPerson.id });
        } else {
          setAssignPickerOpen((v) => !v);
        }
      } else if (k === "m" && topDuplicate) {
        e.preventDefault();
        handleTriage("merge", { targetIssueId: topDuplicate.id });
      } else if (k === "x") {
        e.preventDefault();
        handleTriage("reject");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items, selectedIndex, suggestedPerson, topDuplicate, handleTriage]);

  const staleCount = items.filter((it) => daysSince(it.created_at) >= 1).length;

  return (
    <div className="space-y-4" data-testid="inbox-page">
      <PageHeader
        eyebrow="Project"
        title="Inbox"
        description="Untriaged reports from Slack, email, Sentry, and paste. Clear each one in one click."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeProject?.current_triager && (
              <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
                {activeProject.triage_rotation_cadence === "daily" ? "Today's" : "This week's"}{" "}
                triager:{" "}
                <strong className="text-text">
                  {activeProject.current_triager.full_name || activeProject.current_triager.email}
                </strong>
              </span>
            )}
            {staleCount > 0 && (
              <span className="rounded-md bg-warning/15 px-2 py-1 text-[11px] font-medium text-warning">
                {pluralize(staleCount, "report")} &gt;24h
              </span>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={includeSnoozed}
                onChange={(e) => setIncludeSnoozed(e.target.checked)}
                className="rounded border-border"
              />
              Show snoozed
            </label>
            <Button size="sm" onClick={openCaptureModal}>
              Capture
            </Button>
          </div>
        }
      />

      {!activeProject ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-xs text-text-muted">
          Select or create a project to view its Inbox.
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-[360px_1fr]">
          <div className="h-96 animate-pulse rounded-lg border border-border bg-surface/60" />
          <div className="h-96 animate-pulse rounded-lg border border-border bg-surface/60" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border bg-surface p-12 text-center"
          data-testid="inbox-empty"
        >
          <InboxIcon className="mx-auto h-8 w-8 text-success/70" />
          <h2 className="mt-3 text-sm font-semibold text-text">Inbox zero</h2>
          <p className="mt-1 text-xs text-text-muted">
            Every incoming report has been triaged. Press{" "}
            <kbd className="rounded border border-border px-1 font-mono">C</kbd> to capture a new bug.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[360px_1fr]">
          {/* Left Pane: Report List */}
          <div
            className={`divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface ${
              mobileDetailOpen ? "hidden md:block" : "block"
            }`}
            data-testid="inbox-list"
          >
            {items.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const src = SOURCE_BADGES[item.source || "manual"] || SOURCE_BADGES.manual;
              const dupList =
                ((item.ai_metadata as { possible_duplicates?: AIDuplicateCandidate[] } | undefined)
                  ?.possible_duplicates) || [];
              const firstDup = dupList[0];
              const ageDays = daysSince(item.created_at);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setMobileDetailOpen(true);
                  }}
                  className={`flex w-full flex-col gap-1.5 p-3.5 text-left transition-colors ${
                    isSelected
                      ? "bg-accent/10 border-l-2 border-l-accent"
                      : "hover:bg-surface-elevated/50"
                  }`}
                  data-testid={`inbox-row-${item.key}`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-medium text-text-muted">
                      {src.icon}
                      {src.label}
                    </span>
                    <span
                      className={`font-mono ${
                        ageDays >= 1 ? "font-semibold text-warning" : "text-text-muted"
                      }`}
                    >
                      {formatRelativeAge(item.created_at)}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <PriorityIcon priority={item.priority} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2 text-[13px] font-medium text-text">
                      {item.title}
                    </span>
                  </div>

                  {firstDup && (
                    <span className="inline-flex w-fit items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                      Possible duplicate of {firstDup.key}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Pane: Preview & One-Click Triage Bar */}
          {selectedItem && (
            <div
              className={`flex flex-col justify-between rounded-lg border border-border bg-surface ${
                mobileDetailOpen ? "block" : "hidden md:flex"
              }`}
              data-testid="inbox-preview"
            >
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileDetailOpen(false)}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-text-muted md:hidden"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                    <span className="font-mono text-xs font-semibold text-accent">
                      {selectedItem.key}
                    </span>
                    <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-text-muted">
                      {SOURCE_BADGES[selectedItem.source || "manual"].label}
                    </span>
                    <span className="text-xs text-text-muted">
                      {formatTimeAgo(selectedItem.created_at)}
                    </span>
                  </div>
                  <Link
                    to={`/p/${selectedItem.project_key.toLowerCase()}/issues/${selectedItem.number}`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Open full issue
                  </Link>
                </div>

                <h2 className="text-lg font-semibold leading-snug text-text">
                  {selectedItem.title}
                </h2>

                {(selectedItem.external_reporter_name || selectedItem.external_reporter_email) && (
                  <p className="text-xs text-text-muted">
                    Reported by{" "}
                    <strong className="text-text">
                      {selectedItem.external_reporter_name || selectedItem.external_reporter_email}
                    </strong>
                    {selectedItem.external_reporter_email &&
                      selectedItem.external_reporter_name &&
                      ` (${selectedItem.external_reporter_email})`}
                  </p>
                )}

                {(aiMeta.suggested_priority ||
                  aiMeta.suggested_type ||
                  (aiMeta.suggested_labels?.length ?? 0) > 0 ||
                  aiMeta.triage_reasoning ||
                  (aiMeta.missing_info?.length ?? 0) > 0) && (
                  <div
                    className="rounded-lg border border-accent/25 bg-accent/5 p-3 text-xs space-y-1.5"
                    data-testid="inbox-ai-suggestions"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-accent">AI triage preview</span>
                      {typeof aiMeta.triage_confidence === "number" && (
                        <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                          {Math.round(aiMeta.triage_confidence * 100)}% confidence
                        </span>
                      )}
                      {aiMeta.suggested_priority && (
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium capitalize text-text">
                          Priority: {aiMeta.suggested_priority}
                        </span>
                      )}
                      {aiMeta.suggested_type && (
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium capitalize text-text">
                          Type: {aiMeta.suggested_type}
                        </span>
                      )}
                      {aiMeta.suggested_labels?.map((lbl) => (
                        <span
                          key={lbl}
                          className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-text-muted"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                    {aiMeta.triage_reasoning && (
                      <p className="text-[11px] text-text-muted">{aiMeta.triage_reasoning}</p>
                    )}
                    {aiMeta.missing_info && aiMeta.missing_info.length > 0 && (
                      <p className="text-[11px] text-warning">
                        Needs clarification: {aiMeta.missing_info.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {topDuplicate && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/35 bg-warning/10 p-3 text-xs">
                    <span>
                      Possible duplicate of{" "}
                      <strong className="font-mono text-accent">{topDuplicate.key}</strong>:{" "}
                      {topDuplicate.title} ({Math.round(topDuplicate.similarity * 100)}%)
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => handleTriage("merge", { targetIssueId: topDuplicate.id })}
                    >
                      <GitMerge className="mr-1 h-3 w-3" />
                      Merge into {topDuplicate.key}
                    </Button>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-background/50 p-4 text-xs">
                  {selectedItem.description ? (
                    <SafeMarkdown content={selectedItem.description} />
                  ) : (
                    <p className="italic text-text-muted">No extra details in this report.</p>
                  )}
                </div>
              </div>

              {/* Sticky One-Click Triage Bar */}
              <div className="sticky bottom-0 space-y-2 border-t border-border bg-surface/95 p-3.5 backdrop-blur">
                {assignPickerOpen && (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background p-2">
                    <span className="text-[11px] font-medium text-text-muted">Assign to:</span>
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleTriage("assign", { assigneeId: m.user.id })}
                        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text hover:border-accent hover:text-accent"
                      >
                        {m.user.full_name || m.user.email}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleTriage("accept")}
                      disabled={triageMutation.isPending}
                      className="gap-1.5"
                      data-testid="inbox-accept-btn"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept <kbd className="font-mono text-[10px] opacity-75">E</kbd>
                    </Button>

                    {suggestedPerson ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleTriage("assign", { assigneeId: suggestedPerson.id })
                        }
                        disabled={triageMutation.isPending}
                        className="gap-1.5"
                        title={suggestedPerson.reason}
                        data-testid="inbox-assign-suggested-btn"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-accent" />
                        <span>
                          Assign to {suggestedPerson.full_name.split(" ")[0]}
                          {suggestedPerson.reason ? ` (${suggestedPerson.reason})` : ""}
                        </span>
                        <kbd className="font-mono text-[10px] text-text-muted">A</kbd>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAssignPickerOpen((v) => !v)}
                        className="gap-1.5"
                        data-testid="inbox-assign-btn"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Assign <kbd className="font-mono text-[10px] text-text-muted">A</kbd>
                      </Button>
                    )}

                    {topDuplicate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleTriage("merge", { targetIssueId: topDuplicate.id })
                        }
                        disabled={triageMutation.isPending}
                        className="gap-1.5"
                        data-testid="inbox-merge-btn"
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                        Merge <kbd className="font-mono text-[10px] text-text-muted">M</kbd>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTriage("snooze")}
                      disabled={triageMutation.isPending}
                      className="gap-1.5"
                      data-testid="inbox-snooze-btn"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Snooze
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTriage("reject")}
                      disabled={triageMutation.isPending}
                      className="gap-1.5 text-danger hover:bg-danger/10 hover:text-danger"
                      data-testid="inbox-reject-btn"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Won&apos;t fix <kbd className="font-mono text-[10px] opacity-75">X</kbd>
                    </Button>
                  </div>

                  <span className="hidden text-[10px] text-text-muted lg:inline">
                    <kbd className="rounded border border-border px-1 font-mono">J/K</kbd> navigate
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
