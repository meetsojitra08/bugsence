import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Circle, Clock, CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";
import { QuickAddCard } from "./QuickAddCard";
import type { IssueListItem, IssueStatus } from "../types";

interface KanbanColumnProps {
  status: IssueStatus;
  title: string;
  issues: IssueListItem[];
  onSelectIssue: (issue: IssueListItem) => void;
  onQuickAdd: (title: string, status: IssueStatus) => void;
}

const COLUMN_CONFIG: Record<IssueStatus, { icon: React.ReactNode; dotColor: string }> = {
  inbox: {
    icon: <Circle className="h-3 w-3 text-accent" />,
    dotColor: "bg-accent",
  },
  backlog: {
    icon: <Circle className="h-3 w-3 text-status-backlog" />,
    dotColor: "bg-status-backlog",
  },
  todo: {
    icon: <Circle className="h-3 w-3 text-status-todo" />,
    dotColor: "bg-status-todo",
  },
  in_progress: {
    icon: <Clock className="h-3 w-3 text-status-in_progress" />,
    dotColor: "bg-status-in_progress",
  },
  in_review: {
    icon: <HelpCircle className="h-3 w-3 text-status-in_review" />,
    dotColor: "bg-status-in_review",
  },
  done: {
    icon: <CheckCircle2 className="h-3 w-3 text-status-done" />,
    dotColor: "bg-status-done",
  },
  closed: {
    icon: <CheckCircle2 className="h-3 w-3 text-status-closed" />,
    dotColor: "bg-status-closed",
  },
};

export function KanbanColumn({
  status,
  title,
  issues,
  onSelectIssue,
  onQuickAdd,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = COLUMN_CONFIG[status] || COLUMN_CONFIG.todo;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-surface/50 p-2.5 transition-colors duration-150",
        isOver && "border-accent/50 bg-accent/5 ring-1 ring-accent/20"
      )}
      data-testid={`kanban-column-${status}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
          <span>{title}</span>
          <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-normal tabular-nums text-text-muted">
            {issues.length}
          </span>
        </div>
      </div>

      {/* Cards List */}
      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[200px] flex-1 space-y-2 overflow-y-auto py-2.5">
          {issues.map((issue) => (
            <KanbanCard key={issue.id} issue={issue} onSelect={onSelectIssue} />
          ))}

          {issues.length === 0 && (
            <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border text-[11px] text-text-muted">
              Drop issues here
            </div>
          )}
        </div>
      </SortableContext>

      {/* Quick Add at bottom */}
      <div className="border-t border-border/40 pt-2">
        <QuickAddCard status={status} onQuickAdd={onQuickAdd} />
      </div>
    </div>
  );
}
