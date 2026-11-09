import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LayoutGrid, List } from "lucide-react";
import { useProjectStore } from "@/stores/useProjectStore";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { AuthContext } from "@/features/auth/context/AuthContext";
import {
  useDeleteIssue,
  useIssues,
  useIssueUrlFilters,
  useRestoreIssue,
  useUpdateIssue,
} from "../hooks/useIssues";
import { IssueFilterBar } from "../components/IssueFilterBar";
import { IssueTable } from "../components/IssueTable";
import { CreateIssueModal } from "../components/CreateIssueModal";
import { IssueDetailPanel } from "../components/IssueDetailPanel";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import type { IssueListItem, IssuePriority, IssueStatus } from "../types";

export function IssuesPage() {
  const { key: routeKey } = useParams<{ key?: string }>();
  const location = useLocation();
  const user = useContext(AuthContext)?.user ?? null;
  const { data: projects = [] } = useProjects();
  const { currentProjectId, getActiveProject, setCurrentProjectId } = useProjectStore();
  const isMyIssues = location.pathname === "/my-issues";

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueListItem | null>(null);

  // Sync route project key if present
  useEffect(() => {
    if (routeKey && projects.length > 0) {
      const match = projects.find((p) => p.key.toLowerCase() === routeKey.toLowerCase());
      if (match && match.id !== currentProjectId) {
        setCurrentProjectId(match.id);
      }
    }
  }, [routeKey, projects, currentProjectId, setCurrentProjectId]);

  const activeProject = getActiveProject(projects);

  const { filters, setFilter, setPage, clearFilters, activeFilterCount } = useIssueUrlFilters();
  const effectiveFilters = useMemo(
    () => (isMyIssues && user ? { ...filters, assignee: user.id } : filters),
    [filters, isMyIssues, user]
  );
  const { data: issuesData, isLoading, isError, refetch } = useIssues(
    activeProject?.id || null,
    effectiveFilters
  );

  const updateMutation = useUpdateIssue(undefined, activeProject?.id);
  const deleteMutation = useDeleteIssue(activeProject?.id);
  const restoreMutation = useRestoreIssue(activeProject?.id);

  // Global 'C' shortcut to open create modal
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

  const handleUpdateStatus = (issueId: string, status: IssueStatus) => {
    updateMutation.mutate(
      { id: issueId, payload: { status } },
      {
        onSuccess: () => {
          toast.success("Status updated");
        },
      }
    );
  };

  const handleUpdatePriority = (issueId: string, priority: IssuePriority) => {
    updateMutation.mutate(
      { id: issueId, payload: { priority } },
      {
        onSuccess: () => {
          toast.success("Priority updated");
        },
      }
    );
  };

  const handleDeleteIssue = (issue: IssueListItem) => {
    deleteMutation.mutate(issue.id, {
      onSuccess: () => {
        if (selectedIssue?.id === issue.id) {
          setSelectedIssue(null);
        }
        toast(`Issue ${issue.key} deleted`, {
          action: {
            label: "Undo",
            onClick: () => {
              restoreMutation.mutate(issue.id, {
                onSuccess: () => {
                  toast.success(`Issue ${issue.key} restored`);
                },
              });
            },
          },
        });
      },
    });
  };

  return (
    <div className="space-y-5" data-testid="issues-page">
      <PageHeader
        eyebrow={isMyIssues ? "Personal" : "Workspace"}
        title={isMyIssues ? "My Issues" : "Issues"}
        description={
          isMyIssues
            ? "Everything currently assigned to you."
            : activeProject
              ? `Bugs, features, and tasks in ${activeProject.name}.`
              : "Select a project to view and manage issues."
        }
        actions={
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-[12px]">
            <div
              className="flex items-center gap-1.5 rounded bg-surface-elevated px-2.5 py-1 font-medium text-text"
              data-testid="list-view-active"
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </div>
            <Link
              to={activeProject ? `/p/${activeProject.key.toLowerCase()}/board` : "/board"}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-text-muted transition-colors hover:text-text"
              data-testid="switch-to-board-view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Board</span>
            </Link>
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

          {/* Issue List Table */}
          {isError ? (
            <div
              className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center"
              data-testid="issues-error-state"
            >
              <p className="text-sm font-semibold text-text">Could not load issues</p>
              <p className="mt-1 text-xs text-text-muted">
                The server did not return this project&apos;s issues.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-elevated"
              >
                Try again
              </button>
            </div>
          ) : (
            <IssueTable
              issues={issuesData?.results || []}
              isLoading={isLoading}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
              onUpdateStatus={handleUpdateStatus}
              onUpdatePriority={handleUpdatePriority}
              onDeleteIssue={handleDeleteIssue}
              hasFilters={activeFilterCount > 0}
              onClearFilters={clearFilters}
              onCreateClick={() => setIsCreateModalOpen(true)}
            />
          )}

          {issuesData && issuesData.count > 0 && (
            <Pagination
              page={issuesData.current_page}
              totalPages={issuesData.total_pages}
              totalCount={issuesData.count}
              onPageChange={setPage}
            />
          )}

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
              onDelete={handleDeleteIssue}
              projectId={activeProject.id}
            />
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-sm font-semibold text-text">No active project selected</p>
          <p className="mt-1 text-xs text-text-muted">
            Create or select a workspace project from the header to start managing issues.
          </p>
        </div>
      )}
    </div>
  );
}
