import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Archive, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/useProjectStore";
import { useProjectMembers, useProjects } from "@/features/projects/hooks/useProjects";
import { AuthContext } from "@/features/auth/context/AuthContext";
import {
  useBulkIssueAction,
  useDeleteIssue,
  useIssues,
  useIssueUrlFilters,
  useLabels,
  useRestoreIssue,
  useUpdateIssue,
} from "../hooks/useIssues";
import { IssueFilterBar } from "../components/IssueFilterBar";
import { IssueTable } from "../components/IssueTable";
import { CreateIssueModal } from "../components/CreateIssueModal";
import { IssueDetailPanel } from "../components/IssueDetailPanel";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { pluralize } from "@/lib/format";
import type { IssueListItem, IssuePriority, IssueStatus } from "../types";

type SavedViewKey = "all" | "my_issues" | "unassigned" | "overdue" | "recently_closed";

export function IssuesPage() {
  const { key: routeKey } = useParams<{ key?: string }>();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const user = useContext(AuthContext)?.user ?? null;
  const { data: projects = [] } = useProjects();
  const { currentProjectId, getActiveProject, setCurrentProjectId } = useProjectStore();
  const isMyIssuesRoute = location.pathname === "/my-issues";

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueListItem | null>(null);
  const [groupBy, setGroupBy] = useState<"none" | "status" | "priority" | "assignee">("none");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    () => (isMyIssuesRoute && user ? { ...filters, assignee: user.id } : filters),
    [filters, isMyIssuesRoute, user]
  );

  const {
    data: issuesData,
    isLoading,
    isError,
    refetch,
  } = useIssues(activeProject?.id || null, effectiveFilters);
  const { data: members = [] } = useProjectMembers(activeProject?.id || null);
  const { data: labels = [] } = useLabels(activeProject?.id || null);

  const updateMutation = useUpdateIssue(undefined, activeProject?.id);
  const deleteMutation = useDeleteIssue(activeProject?.id);
  const restoreMutation = useRestoreIssue(activeProject?.id);
  const bulkMutation = useBulkIssueAction(activeProject?.id || null);

  // Clear bulk selection when issue list changes
  const issueResults = useMemo(() => issuesData?.results || [], [issuesData?.results]);
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => issueResults.some((i) => i.id === id)));
  }, [issueResults]);

  const activeSavedView: SavedViewKey = useMemo(() => {
    if (isMyIssuesRoute || (user && filters.assignee === user.id)) return "my_issues";
    if (filters.assignee === "unassigned") return "unassigned";
    if (filters.overdue) return "overdue";
    if (filters.recently_closed) return "recently_closed";
    return "all";
  }, [isMyIssuesRoute, user, filters.assignee, filters.overdue, filters.recently_closed]);

  const applySavedView = (view: SavedViewKey) => {
    const next = new URLSearchParams();
    if (view === "my_issues" && user) next.set("assignee", user.id);
    if (view === "unassigned") next.set("assignee", "unassigned");
    if (view === "overdue") next.set("overdue", "true");
    if (view === "recently_closed") next.set("recently_closed", "true");
    setSearchParams(next);
  };

  const handleUpdateStatus = (issueId: string, status: IssueStatus) => {
    updateMutation.mutate(
      { id: issueId, payload: { status } },
      { onSuccess: () => toast.success("Status updated") }
    );
  };

  const handleUpdatePriority = (issueId: string, priority: IssuePriority) => {
    updateMutation.mutate(
      { id: issueId, payload: { priority } },
      { onSuccess: () => toast.success("Priority updated") }
    );
  };

  const handleArchiveIssue = (issue: IssueListItem) => {
    deleteMutation.mutate(issue.id, {
      onSuccess: () => {
        if (selectedIssue?.id === issue.id) setSelectedIssue(null);
        toast(`Archived ${issue.key}`, {
          action: {
            label: "Undo",
            onClick: () => {
              restoreMutation.mutate(issue.id, {
                onSuccess: () => toast.success(`Restored ${issue.key}`),
              });
            },
          },
        });
      },
    });
  };

  const toggleSelect = (issueId: string) => {
    setSelectedIds((prev) =>
      prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId]
    );
  };

  const toggleSelectAll = () => {
    const allSelected =
      issueResults.length > 0 && issueResults.every((i) => selectedIds.includes(i.id));
    setSelectedIds(allSelected ? [] : issueResults.map((i) => i.id));
  };

  const runBulk = (
    payload: Omit<Parameters<typeof bulkMutation.mutate>[0], "issue_ids">,
    label: string
  ) => {
    if (selectedIds.length === 0) return;
    bulkMutation.mutate(
      { ...payload, issue_ids: selectedIds },
      {
        onSuccess: (res) => {
          toast.success(`${label} (${pluralize(res.updated_count, "issue")})`);
          setSelectedIds([]);
        },
        onError: () => toast.error("Bulk action failed"),
      }
    );
  };

  return (
    <div className="space-y-4" data-testid="issues-page">
      <PageHeader
        eyebrow={isMyIssuesRoute ? "Personal" : "Project"}
        title={isMyIssuesRoute ? "My issues" : "Issues"}
        description={
          isMyIssuesRoute
            ? "Everything currently assigned to you."
            : activeProject
              ? `Search and bulk-manage issues in ${activeProject.name}.`
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
          {/* Saved Views Strip */}
          {!isMyIssuesRoute && (
            <div className="flex flex-wrap items-center gap-1.5" data-testid="saved-views-bar">
              {[
                { key: "all", label: "All issues" },
                { key: "my_issues", label: "My issues" },
                { key: "unassigned", label: "Unassigned" },
                { key: "overdue", label: "Overdue" },
                { key: "recently_closed", label: "Recently closed" },
              ].map((view) => {
                const active = activeSavedView === view.key;
                return (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => applySavedView(view.key as SavedViewKey)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-text-muted hover:text-text"
                    }`}
                    data-testid={`saved-view-${view.key}`}
                  >
                    {view.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
            <label className="inline-flex items-center gap-1.5 text-text-muted">
              <span>Sort:</span>
              <select
                aria-label="Sort issues"
                value={filters.ordering || "-created_at"}
                onChange={(e) => setFilter("ordering", e.target.value)}
                className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-text focus:border-accent focus:outline-none"
                data-testid="issues-sort-select"
              >
                <option value="-created_at">Newest</option>
                <option value="-updated_at">Recently updated</option>
                <option value="priority">Highest priority</option>
                <option value="due_date">Due date (soonest)</option>
                <option value="-number">Issue key (desc)</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5 text-text-muted">
              <span>Group:</span>
              <select
                aria-label="Group issues"
                value={groupBy}
                onChange={(e) =>
                  setGroupBy(e.target.value as "none" | "status" | "priority" | "assignee")
                }
                className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-text focus:border-accent focus:outline-none"
                data-testid="issues-group-select"
              >
                <option value="none">None</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
                <option value="assignee">Assignee</option>
              </select>
            </label>
          </div>

          <IssueFilterBar
            filters={filters}
            onSetFilter={setFilter}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />

          {/* Bulk Action Toolbar */}
          {selectedIds.length > 0 && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs"
              data-testid="bulk-action-bar"
            >
              <span className="font-semibold text-text">
                {pluralize(selectedIds.length, "issue")} selected
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    runBulk(
                      {
                        action: "assign",
                        assignee_id: e.target.value === "unassigned" ? null : e.target.value,
                      },
                      "Assigned"
                    );
                  }}
                  aria-label="Bulk assign"
                  className="h-7 rounded border border-border bg-surface px-2 text-xs text-text"
                >
                  <option value="">Assign to…</option>
                  <option value="unassigned">Unassign</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.user.id}>
                      {m.user.full_name || m.user.email}
                    </option>
                  ))}
                </select>

                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    runBulk({ action: "status", status: e.target.value as IssueStatus }, "Updated status");
                  }}
                  aria-label="Bulk change status"
                  className="h-7 rounded border border-border bg-surface px-2 text-xs text-text"
                >
                  <option value="">Set status…</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                  <option value="closed">Closed</option>
                </select>

                {labels.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      runBulk({ action: "add_label", label_id: e.target.value }, "Added label");
                    }}
                    aria-label="Bulk add label"
                    className="h-7 rounded border border-border bg-surface px-2 text-xs text-text"
                  >
                    <option value="">Add label…</option>
                    {labels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runBulk({ action: "archive" }, "Archived")}
                  className="h-7 gap-1 text-xs text-danger hover:bg-danger/10"
                >
                  <Archive className="h-3 w-3" />
                  Archive
                </Button>
              </div>
            </div>
          )}

          {isError ? (
            <div
              className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center"
              data-testid="issues-error-state"
            >
              <p className="text-sm font-semibold text-text">Could not load issues</p>
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
              issues={issueResults}
              isLoading={isLoading}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
              onUpdateStatus={handleUpdateStatus}
              onUpdatePriority={handleUpdatePriority}
              hasFilters={activeFilterCount > 0}
              onClearFilters={clearFilters}
              onCreateClick={() => setIsCreateModalOpen(true)}
              groupBy={groupBy}
            />
          )}

          {/* Hide pagination until over 25 items */}
          {issuesData && issuesData.count > 25 && (
            <Pagination
              page={issuesData.current_page}
              totalPages={issuesData.total_pages}
              totalCount={issuesData.count}
              onPageChange={setPage}
            />
          )}

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
              onDelete={handleArchiveIssue}
              projectId={activeProject.id}
            />
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-sm font-semibold text-text">No active project selected</p>
          <p className="mt-1 text-xs text-text-muted">
            Select a project from the header to view and manage issues.
          </p>
        </div>
      )}
    </div>
  );
}
