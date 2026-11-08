import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Bug, Calendar, CheckCircle2, Circle, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssueListItem, IssuePriority, IssueType } from "../types";

interface KanbanCardProps {
  issue: IssueListItem;
  onSelect: (issue: IssueListItem) => void;
  isOverlay?: boolean;
}

const TYPE_ICONS: Record<IssueType, React.ReactNode> = {
  bug: <Bug className="h-3 w-3 text-red-400" />,
  feature: <Sparkles className="h-3 w-3 text-blue-400" />,
  task: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
  improvement: <AlertCircle className="h-3 w-3 text-amber-400" />,
};

const PRIORITY_ICONS: Record<IssuePriority, React.ReactNode> = {
  urgent: <Flame className="h-3 w-3 text-red-400" />,
  high: <Flame className="h-3 w-3 text-amber-400" />,
  medium: <Circle className="h-2.5 w-2.5 text-yellow-400" />,
  low: <Circle className="h-2.5 w-2.5 text-blue-400" />,
};

export function KanbanCard({ issue, onSelect, isOverlay = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
  });

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
      onClick={(e) => {
        // Only trigger select if not dragging
        if (!isDragging) {
          e.stopPropagation();
          onSelect(issue);
        }
      }}
      className={cn(
        "shadow-xs group relative flex cursor-grab select-none flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-xs transition-all duration-150 active:cursor-grabbing",
        isDragging && "border-dashed border-primary opacity-30",
        isOverlay &&
          "z-50 rotate-2 scale-105 border-primary bg-surface/95 shadow-2xl backdrop-blur-sm",
        !isDragging &&
          !isOverlay &&
          "hover:border-primary/40 hover:bg-background/80 hover:shadow-md"
      )}
      data-testid={`kanban-card-${issue.key}`}
    >
      {/* Top Header: Key, Type, Priority */}
      <div className="flex items-center justify-between gap-1 text-[11px]">
        <div className="flex items-center gap-1.5 font-mono font-semibold text-text-muted transition-colors group-hover:text-primary">
          <span>{TYPE_ICONS[issue.type] || TYPE_ICONS.bug}</span>
          <span>{issue.key}</span>
        </div>

        <div className="flex items-center gap-1">
          <span title={`Priority: ${issue.priority}`}>{PRIORITY_ICONS[issue.priority]}</span>
        </div>
      </div>

      {/* Title */}
      <p className="line-clamp-2 font-medium leading-snug text-text">{issue.title}</p>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {issue.labels.slice(0, 2).map((lbl) => (
            <span
              key={lbl.id}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium"
              style={{
                backgroundColor: `${lbl.color}20`,
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
      <div className="flex items-center justify-between border-t border-border/40 pt-1 text-[10px]">
        {/* Due date */}
        {issue.due_date ? (
          <div
            className={cn(
              "flex items-center gap-1 font-medium",
              isOverdue ? "font-semibold text-red-400" : "text-text-muted"
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
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary"
          >
            {issue.assignee.full_name?.[0] || "U"}
          </div>
        ) : (
          <div
            title="Unassigned"
            className="h-2 w-2 rounded-full border border-border/80 bg-zinc-700/40"
          />
        )}
      </div>
    </div>
  );
}
