import { useEffect, useState } from "react";
import { Search, X, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IssueFilters, IssuePriority, IssueStatus } from "../types";

interface IssueFilterBarProps {
  filters: IssueFilters;
  onSetFilter: (key: keyof IssueFilters, value: string | undefined | null) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  onOpenCreateModal: () => void;
}

const STATUS_CHIPS: { label: string; value?: IssueStatus; dot?: string }[] = [
  { label: "All", value: undefined },
  { label: "To Do", value: "todo", dot: "bg-status-todo" },
  { label: "In Progress", value: "in_progress", dot: "bg-status-in_progress" },
  { label: "In Review", value: "in_review", dot: "bg-status-in_review" },
  { label: "Done", value: "done", dot: "bg-status-done" },
  { label: "Backlog", value: "backlog", dot: "bg-status-backlog" },
];

const PRIORITIES: { label: string; value?: IssuePriority }[] = [
  { label: "All Priorities", value: undefined },
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export function IssueFilterBar({
  filters,
  onSetFilter,
  onClearFilters,
  activeFilterCount,
  onOpenCreateModal,
}: IssueFilterBarProps) {
  const [search, setSearch] = useState(filters.search ?? "");

  // Keep the input in sync when the URL changes from elsewhere (back button, clear).
  useEffect(() => {
    setSearch(filters.search ?? "");
  }, [filters.search]);

  // Debounce URL writes so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      if ((filters.search ?? "") !== next) {
        onSetFilter("search", next || undefined);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, filters.search, onSetFilter]);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description or number..."
            className="h-8 bg-background pl-8 pr-8 text-[12px] placeholder:text-text-muted/70"
            data-testid="issues-search-input"
            aria-label="Search issues"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                onSetFilter("search", undefined);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Priority Filter and Action */}
        <div className="flex items-center gap-2">
          {/* Priority Select */}
          <div className="relative">
            <select
              value={filters.priority || ""}
              onChange={(e) => onSetFilter("priority", e.target.value || undefined)}
              aria-label="Filter by priority"
              className="h-8 rounded-lg border border-border bg-background px-2.5 pr-7 text-xs font-medium text-text shadow-xs focus:border-accent focus:outline-none"
              data-testid="priority-filter-select"
            >
              {PRIORITIES.map((p) => (
                <option key={p.label} value={p.value || ""}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters pill */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="h-8 gap-1.5 px-2.5 text-xs text-text-muted hover:border-danger/30 hover:text-danger"
              data-testid="clear-filters-btn"
            >
              <Filter className="h-3 w-3" />
              <span>Clear ({activeFilterCount})</span>
            </Button>
          )}

          {/* New Issue Button */}
          <Button
            size="sm"
            onClick={onOpenCreateModal}
            className="h-8 gap-1.5 px-3 text-xs shadow-xs shadow-accent/20"
            data-testid="create-issue-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Issue</span>
            <kbd className="hidden rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px] font-medium sm:inline-block">
              C
            </kbd>
          </Button>
        </div>
      </div>

      {/* Status Chips */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
        <span className="mr-1 text-[11px] font-medium text-text-muted">Status:</span>
        {STATUS_CHIPS.map((chip) => {
          const isActive =
            (chip.value === undefined && !filters.status) ||
            filters.status?.toLowerCase() === chip.value?.toLowerCase();

          return (
            <button
              key={chip.label}
              onClick={() => onSetFilter("status", chip.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-150",
                isActive
                  ? "border-accent bg-accent/10 text-accent shadow-xs"
                  : "border-border bg-background/50 text-text-muted hover:border-border/80 hover:bg-background hover:text-text"
              )}
              data-testid={`status-chip-${chip.value || "all"}`}
              aria-pressed={isActive}
            >
              {chip.dot && <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />}
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
