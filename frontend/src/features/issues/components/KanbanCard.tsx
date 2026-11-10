import React, { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Bug, Calendar, CheckCircle2, GitPullRequest, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysSince } from "@/lib/format";
import { PriorityIcon } from "./PriorityIcon";
import type { IssueListItem, IssueType } from "../types";

interface KanbanCardProps {
  issue: IssueListItem;
  onSelect: (issue: IssueListItem) => void;
  isOverlay?: boolean;
}

const TYPE_ICONS: Record<IssueType, React.ReactNode> = {
  bug: <Bug className="h-3 w-3 text-danger" />,
  feature: <Sparkles className="h-3 w-3 text-info" />,
  task: <CheckCircle2 className="h-3 w-3 text-success" />,
  improvement: <AlertCircle className="h-3 w-3 text-warning" />,
};

export function KanbanCard({ issue, onSelect, isOverlay = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
  });
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    Boolean(issue.due_date) &&
    new Date(issue.due_date!) < new Date(new Date().toDateString()) &&
    issue.status !== "done" &&
    issue.status !== "closed";

  const ageInDays = daysSince(issue.updated_at);
  const showAging =
    ageInDays > 3 && issue.status !== "done" && issue.status !== "closed";

  const linkedPr = issue.pull_requests?.[0] ?? null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDownCapture={(event) => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
      }}
      onClick={(e) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) return;
        if (!isDragging) {
          e.stopPropagation();
          onSelect(issue);
        }
      }}
      className={cn(
        "group relative flex cursor-grab select-none flex-col gap-2 rounded-md border border-border bg-surface p-3 text-[12px] transition-colors duration-150 active:cursor-grabbing",
        isDragging && "border-dashed border-accent opacity-30",
        isOverlay && "z-50 rotate-1 scale-[1.02] border-accent bg-surface shadow-popover",
        !isDragging && !isOverlay && "hover:border-text-muted/30"
      )}
      data-testid={`kanban-card-${issue.key}`}
    >
      {/* Top Header: Key, Type, Aging, Priority */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        <div className="flex items-center gap-1.5 font-mono font-semibold text-text-muted transition-colors group-hover:text-accent">
          <span>{TYPE_ICONS[issue.type] || TYPE_ICONS.bug}</span>
          <span>{issue.key}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {showAging && (
            <span
              className="rounded bg-warning/15 px-1 py-0.5 font-mono text-[9px] font-medium text-warning"
              title={`Unchanged for ${ageInDays} days`}
            >
              {ageInDays}d
            </span>
          )}
          <span title={`Priority: ${issue.priority}`}>
            <PriorityIcon priority={issue.priority} className="h-3 w-3" />
          </span>
        </div>
      </div>

      {/* Title */}
      <p className="line-clamp-2 text-[12px] font-medium leading-snug text-text">{issue.title}</p>

      {/* Bottom Footer: Due Date (only if set), Linked PR CI state, Assignee Avatar */}
      <div className="flex items-center justify-between border-t border-border/60 pt-1.5 text-[10px]">
        <div className="flex items-center gap-2">
          {issue.due_date && (
            <div
              className={cn(
                "flex items-center gap-1 font-medium",
                isOverdue ? "font-semibold text-danger" : "text-text-muted"
              )}
              title={isOverdue ? "Overdue" : "Due date"}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(issue.due_date).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          {linkedPr && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[9px] font-medium",
                linkedPr.ci_status === "success"
                  ? "bg-success/15 text-success"
                  : linkedPr.ci_status === "failure"
                    ? "bg-danger/15 text-danger"
                    : "bg-warning/15 text-warning"
              )}
              title={`PR #${linkedPr.pr_number} (${linkedPr.ci_status})`}
            >
              <GitPullRequest className="h-2.5 w-2.5" />
              #{linkedPr.pr_number}
            </span>
          )}
        </div>

        {issue.assignee ? (
          <div
            title={`Assigned to ${issue.assignee.full_name}`}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[9px] font-semibold text-accent"
          >
            {issue.assignee.full_name?.[0] || "U"}
          </div>
        ) : (
          <div
            title="Unassigned"
            className="h-2 w-2 rounded-full border border-border/80 bg-text-muted/30"
          />
        )}
      </div>
    </div>
  );
}
