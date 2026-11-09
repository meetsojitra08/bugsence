import React, { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Bug, Calendar, CheckCircle2, Circle, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/color";
import type { IssueListItem, IssuePriority, IssueType } from "../types";

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

const PRIORITY_ICONS: Record<IssuePriority, React.ReactNode> = {
  urgent: <Flame className="h-3 w-3 text-priority-urgent" />,
  high: <Flame className="h-3 w-3 text-priority-high" />,
  medium: <Circle className="h-2.5 w-2.5 text-priority-medium" />,
  low: <Circle className="h-2.5 w-2.5 text-priority-low" />,
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
        // Ignore the click that follows a drag gesture.
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
      {/* Top Header: Key, Type, Priority */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        <div className="flex items-center gap-1.5 font-mono font-semibold text-text-muted transition-colors group-hover:text-accent">
          <span>{TYPE_ICONS[issue.type] || TYPE_ICONS.bug}</span>
          <span>{issue.key}</span>
        </div>

        <div className="flex items-center gap-1">
          <span title={`Priority: ${issue.priority}`}>{PRIORITY_ICONS[issue.priority]}</span>
        </div>
      </div>

      {/* Title */}
      <p className="line-clamp-2 text-[12px] font-medium leading-snug text-text">{issue.title}</p>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {issue.labels.slice(0, 2).map((lbl) => (
            <span
              key={lbl.id}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium"
              style={{
                backgroundColor: hexToRgba(lbl.color, 0.13),
                color: lbl.color,
              }}
            >
              {lbl.name}
            </span>
          ))}
          {issue.labels.length > 2 && (
            <span className="text-[9px] text-text-muted">+{issue.labels.length - 2}</span>
          )}
        </div>
      )}

      {/* Bottom Footer: Due Date & Assignee Avatar */}
      <div className="flex items-center justify-between border-t border-border/60 pt-1.5 text-[10px]">
        {/* Due date */}
        {issue.due_date ? (
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
        ) : (
          <div />
        )}

        {/* Assignee Avatar */}
        {issue.assignee ? (
          <div
            title={`Assigned to ${issue.assignee.full_name}`}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[9px] font-semibold text-accent"
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
