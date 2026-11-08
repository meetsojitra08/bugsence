import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useProjectStore } from "@/stores/useProjectStore";
import { useProjects } from "@/features/projects/hooks/useProjects";
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
import type { IssueListItem, IssuePriority, IssueStatus } from "../types";

export function IssuesPage() {
  const { key: routeKey } = useParams<{ key?: string }>();
  const { data: projects = [] } = useProjects();
  const { currentProjectId, getActiveProject, setCurrentProjectId } = useProjectStore();

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

  const { filters, setFilter, clearFilters, activeFilterCount } = useIssueUrlFilters();
  const { data: issuesData, isLoading } = useIssues(activeProject?.id || null, filters);

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
    <div className="space-y-4" data-testid="issues-page">
      {/* Header section */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">Issues</h1>
          <p className="text-xs text-text-muted">
            {activeProject
              ? `Manage and track bugs, features, and tasks in ${activeProject.name}`
              : "Select a project to view and manage issues"}
          </p>
        </div>
      </div>

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

          {/* Quick Create Modal */}
          <CreateIssueModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            projectId={activeProject.id}
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
