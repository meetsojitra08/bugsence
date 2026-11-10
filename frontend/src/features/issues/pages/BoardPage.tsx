import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/useProjectStore";
import { useProjectMembers, useProjects } from "@/features/projects/hooks/useProjects";
import { AuthContext } from "@/features/auth/context/AuthContext";
import {
  useBoard,
  useCreateIssue,
  useDeleteIssue,
  useIssueUrlFilters,
  useLabels,
  useMoveIssue,
  useRestoreIssue,
} from "../hooks/useIssues";
import { KanbanBoard } from "../components/KanbanBoard";
import { CreateIssueModal } from "../components/CreateIssueModal";
import { IssueDetailPanel } from "../components/IssueDetailPanel";
import { PageHeader } from "@/components/common/PageHeader";
import type { IssueListItem, IssueStatus, MoveIssuePayload } from "../types";

export function BoardPage() {
  const { key: routeKey } = useParams<{ key?: string }>();
  const user = useContext(AuthContext)?.user ?? null;
  const { data: projects = [] } = useProjects();
  const { currentProjectId, getActiveProject, setCurrentProjectId } = useProjectStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueListItem | null>(null);
  const [showBacklog, setShowBacklog] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

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
  const { data: members = [] } = useProjectMembers(activeProject?.id || null);
  const { data: labels = [] } = useLabels(activeProject?.id || null);

  const moveMutation = useMoveIssue(activeProject?.id || null);
  const createMutation = useCreateIssue(activeProject?.id || null);
  const deleteMutation = useDeleteIssue(activeProject?.id);
  const restoreMutation = useRestoreIssue(activeProject?.id);

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
      inbox: [],
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      closed: [],
    },
    counts: {
      inbox: 0,
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      closed: 0,
    },
  };

  const isOnlyMe = Boolean(user && filters.assignee === user.id);

  return (
    <div className="space-y-5" data-testid="board-page">
      <PageHeader
        eyebrow="Project"
        title="Board"
        description={
          activeProject
            ? `Four-stage workflow for ${activeProject.name}.`
            : "Select a project to view the board."
        }
        actions={
          <div className="flex items-center gap-2">
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
          </div>
        }
      />

      {activeProject ? (
        <>
          {/* Board Filters: Only me, Assignee, Priority, Label + Column Toggles (No status chips) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-surface p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {user && (
                <button
                  type="button"
                  onClick={() => setFilter("assignee", isOnlyMe ? undefined : user.id)}
                  aria-pressed={isOnlyMe}
                  className={`h-8 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                    isOnlyMe
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background text-text-muted hover:text-text"
                  }`}
                  data-testid="board-only-me-btn"
                >
                  Only me
                </button>
              )}

              <select
                value={filters.assignee || ""}
                onChange={(e) => setFilter("assignee", e.target.value || undefined)}
                aria-label="Filter board by assignee"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-text focus:border-accent focus:outline-none"
              >
                <option value="">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.user.id}>
                    {m.user.full_name || m.user.email}
                  </option>
                ))}
              </select>

              <select
                value={filters.priority || ""}
                onChange={(e) => setFilter("priority", e.target.value || undefined)}
                aria-label="Filter board by priority"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-text focus:border-accent focus:outline-none"
                data-testid="priority-filter-select"
              >
                <option value="">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {labels.length > 0 && (
                <select
                  value={filters.label || ""}
                  onChange={(e) => setFilter("label", e.target.value || undefined)}
                  aria-label="Filter board by label"
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-text focus:border-accent focus:outline-none"
                >
                  <option value="">All labels</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-text-muted hover:text-text"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBacklog((v) => !v)}
                aria-pressed={showBacklog}
                className={`h-8 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                  showBacklog
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-background text-text-muted hover:text-text"
                }`}
              >
                {showBacklog ? "Hide Backlog" : "Backlog"}
              </button>
              <button
                type="button"
                onClick={() => setShowClosed((v) => !v)}
                aria-pressed={showClosed}
                className={`h-8 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                  showClosed
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-background text-text-muted hover:text-text"
                }`}
              >
                {showClosed ? "Hide Closed" : "Closed"}
              </button>
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8 gap-1.5 text-xs"
                data-testid="create-issue-btn"
              >
                <Plus className="h-3.5 w-3.5" />
                Capture
              </Button>
            </div>
          </div>

          <KanbanBoard
            boardData={boardData || defaultBoardData}
            isLoading={isLoading}
            showBacklog={showBacklog}
            showClosed={showClosed}
            onSelectIssue={(issue) => setSelectedIssue(issue)}
            onMoveIssue={handleMoveIssue}
            onQuickAdd={handleQuickAdd}
          />

          <CreateIssueModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreated={(issue) => setSelectedIssue(issue)}
            projectId={activeProject.id}
            projectKey={activeProject.key}
          />

          {selectedIssue && (
            <IssueDetailPanel
              issue={selectedIssue}
              onClose={() => setSelectedIssue(null)}
              onDelete={(issue) => {
                deleteMutation.mutate(issue.id, {
                  onSuccess: () => {
                    setSelectedIssue(null);
                    toast(`Archived ${issue.key}`, {
                      action: {
                        label: "Undo",
                        onClick: () => restoreMutation.mutate(issue.id),
                      },
                    });
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
