import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LayoutGrid, List } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useProjects } from "@/features/projects/hooks/useProjects";
import {
  useBoard,
  useCreateIssue,
  useDeleteIssue,
  useIssueUrlFilters,
  useMoveIssue,
} from "../hooks/useIssues";
import { IssueFilterBar } from "../components/IssueFilterBar";
import { KanbanBoard } from "../components/KanbanBoard";
import { CreateIssueModal } from "../components/CreateIssueModal";
import { IssueDetailPanel } from "../components/IssueDetailPanel";
import { PageHeader } from "@/components/common/PageHeader";
import type { IssueListItem, IssueStatus, MoveIssuePayload } from "../types";

export function BoardPage() {
  const { key: routeKey } = useParams<{ key?: string }>();
  const { data: projects = [] } = useProjects();
  const { currentProjectId, getActiveProject, setCurrentProjectId } = useProjectStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueListItem | null>(null);

  // Sync project key from URL
  useEffect(() => {
    if (routeKey && projects.length > 0) {
      const match = projects.find((p) => p.key.toLowerCase() === routeKey.toLowerCase());
      if (match && match.id !== currentProjectId) {
        setCurrentProjectId(match.id);
      }
    }
  }, [routeKey, projects, currentProjectId, setCurrentProjectId]);

  const activeProject = getActiveProject(projects);

  const { filters, setFilter, clearFilters, activeFilterCount } = useIssueUrlFilters();
  const { data: boardData, isLoading } = useBoard(activeProject?.id || null, filters);

  const moveMutation = useMoveIssue(activeProject?.id || null);
  const createMutation = useCreateIssue(activeProject?.id || null);
  const deleteMutation = useDeleteIssue(activeProject?.id);

  // Global 'C' shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "c" || e.key === "C") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        const target = e.target as HTMLElement;
        const isEditing =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable;

        if (!isEditing && activeProject) {
          e.preventDefault();
          setIsCreateModalOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeProject]);

  const handleMoveIssue = (issueId: string, payload: MoveIssuePayload) => {
    moveMutation.mutate(
      { issueId, payload },
      {
        onError: () => {
          toast.error("Failed to move issue. Reverting order.");
        },
      }
    );
  };

  const handleQuickAdd = (title: string, status: IssueStatus) => {
    createMutation.mutate(
      { title, status },
      {
        onSuccess: () => {
          toast.success("Issue added to board");
        },
        onError: () => {
          toast.error("Failed to create issue");
        },
      }
    );
  };

  const defaultBoardData = {
    columns: {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      closed: [],
    },
    counts: {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      closed: 0,
    },
  };

  return (
    <div className="space-y-5" data-testid="board-page">
      <PageHeader
        eyebrow="Workspace"
        title="Kanban Board"
        description={
          activeProject
            ? `Drag issues through the workflow for ${activeProject.name}.`
            : "Select a project to view the kanban board."
        }
        actions={
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-[12px]">
            <Link
              to={activeProject ? `/p/${activeProject.key.toLowerCase()}/issues` : "/issues"}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-text-muted transition-colors hover:text-text"
              data-testid="switch-to-list-view"
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </Link>
            <div
              className="flex items-center gap-1.5 rounded bg-surface-elevated px-2.5 py-1 font-medium text-text"
              data-testid="board-view-active"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Board</span>
            </div>
          </div>
        }
      />

      {activeProject ? (
        <>
          {/* Filters Bar */}
          <IssueFilterBar
            filters={filters}
            onSetFilter={setFilter}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />

          {/* Kanban Board Container */}
          <KanbanBoard
            boardData={boardData || defaultBoardData}
            isLoading={isLoading}
            onSelectIssue={(issue) => setSelectedIssue(issue)}
            onMoveIssue={handleMoveIssue}
            onQuickAdd={handleQuickAdd}
          />

          {/* Quick Create Modal */}
          <CreateIssueModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            projectId={activeProject.id}
            projectKey={activeProject.key}
          />

          {/* Right-side Detail Panel */}
          {selectedIssue && (
            <IssueDetailPanel
              issue={selectedIssue}
              onClose={() => setSelectedIssue(null)}
              onDelete={(issue) => {
                deleteMutation.mutate(issue.id, {
                  onSuccess: () => {
                    setSelectedIssue(null);
                    toast.success("Issue deleted");
                  },
                });
              }}
              projectId={activeProject.id}
            />
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-sm font-semibold text-text">No active project selected</p>
          <p className="mt-1 text-xs text-text-muted">
            Select a project from the header to view its board.
          </p>
        </div>
      )}
    </div>
  );
}
