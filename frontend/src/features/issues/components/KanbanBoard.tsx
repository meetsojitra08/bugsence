import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import type { BoardData, IssueListItem, IssueStatus, MoveIssuePayload } from "../types";

interface KanbanBoardProps {
  boardData: BoardData;
  isLoading: boolean;
  onSelectIssue: (issue: IssueListItem) => void;
  onMoveIssue: (issueId: string, payload: MoveIssuePayload) => void;
  onQuickAdd: (title: string, status: IssueStatus) => void;
}

const BOARD_COLUMNS: { status: IssueStatus; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in_progress", title: "In Progress" },
  { status: "in_review", title: "In Review" },
  { status: "done", title: "Done" },
  { status: "backlog", title: "Backlog" },
];

export function KanbanBoard({
  boardData,
  isLoading,
  onSelectIssue,
  onMoveIssue,
  onQuickAdd,
}: KanbanBoardProps) {
  const [activeIssue, setActiveIssue] = useState<IssueListItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findIssueById = (id: string): IssueListItem | null => {
    for (const columnItems of Object.values(boardData.columns)) {
      const match = columnItems.find((i) => i.id === id);
      if (match) return match;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const issue = findIssueById(String(event.active.id));
    setActiveIssue(issue);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceIssue = findIssueById(activeId);
    if (!sourceIssue) return;

    // Determine target column status
    let targetStatus: IssueStatus | null = null;

    // 1. Check if dropped directly onto a column container
    if (Object.keys(boardData.columns).includes(overId)) {
      targetStatus = overId as IssueStatus;
    } else {
      // 2. Dropped over another issue in a column
      const targetIssue = findIssueById(overId);
      if (targetIssue) {
        targetStatus = targetIssue.status;
      }
    }

    if (!targetStatus) return;

    const targetColumn = boardData.columns[targetStatus] || [];
    const overIndex = targetColumn.findIndex((i) => i.id === overId);

    let before_id: string | null = null;
    let after_id: string | null = null;

    if (overIndex !== -1) {
      // Dropped onto an item
      after_id = targetColumn[overIndex]?.id || null;
      before_id = targetColumn[overIndex - 1]?.id || null;
    } else if (targetColumn.length > 0) {
      // Dropped onto the column container: place after last item
      before_id = targetColumn[targetColumn.length - 1].id;
    }

    onMoveIssue(activeId, {
      status: targetStatus,
      before_id,
      after_id,
    });
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="h-[480px] w-80 flex-shrink-0 animate-pulse rounded-xl border border-border bg-surface/50 p-4"
          >
            <div className="h-5 w-24 rounded bg-zinc-800" />
            <div className="mt-4 space-y-3">
              <div className="h-20 rounded-lg bg-zinc-800/60" />
              <div className="h-20 rounded-lg bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="scrollbar-thin scrollbar-thumb-border flex gap-4 overflow-x-auto pb-6"
        data-testid="kanban-board"
      >
        {BOARD_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            title={col.title}
            issues={boardData.columns[col.status] || []}
            onSelectIssue={onSelectIssue}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>

      {/* Drag overlay with tilt */}
      <DragOverlay>
        {activeIssue ? <KanbanCard issue={activeIssue} onSelect={() => {}} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
