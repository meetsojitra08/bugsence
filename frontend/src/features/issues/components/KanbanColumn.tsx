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
  backlog: {
    icon: <Circle className="h-3 w-3 text-zinc-500" />,
    dotColor: "bg-zinc-500",
  },
  todo: {
    icon: <Circle className="h-3 w-3 text-zinc-400" />,
    dotColor: "bg-zinc-400",
  },
  in_progress: {
    icon: <Clock className="h-3 w-3 text-blue-400" />,
    dotColor: "bg-blue-400",
  },
  in_review: {
    icon: <HelpCircle className="h-3 w-3 text-purple-400" />,
    dotColor: "bg-purple-400",
  },
  done: {
    icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
    dotColor: "bg-emerald-400",
  },
  closed: {
    icon: <CheckCircle2 className="h-3 w-3 text-zinc-500" />,
    dotColor: "bg-zinc-600",
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
        "shadow-xs flex w-80 flex-shrink-0 flex-col rounded-xl border border-border/80 bg-surface/60 p-3 transition-colors duration-150",
        isOver && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
      )}
      data-testid={`kanban-column-${status}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3 text-xs font-semibold text-text">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
          <span>{title}</span>
          <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 font-mono text-[10px] text-text-muted">
            {issues.length}
          </span>
        </div>
      </div>

      {/* Cards List */}
      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[220px] flex-1 space-y-2.5 overflow-y-auto py-3">
          {issues.map((issue) => (
            <KanbanCard key={issue.id} issue={issue} onSelect={onSelectIssue} />
          ))}

          {issues.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 text-[11px] italic text-text-muted">
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
