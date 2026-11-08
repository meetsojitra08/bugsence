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

const STATUS_CHIPS: { label: string; value?: IssueStatus; color: string }[] = [
  { label: "All", value: undefined, color: "border-border text-text-muted" },
  { label: "To Do", value: "todo", color: "border-zinc-500/30 text-zinc-400" },
  { label: "In Progress", value: "in_progress", color: "border-blue-500/30 text-blue-400" },
  { label: "In Review", value: "in_review", color: "border-purple-500/30 text-purple-400" },
  { label: "Done", value: "done", color: "border-emerald-500/30 text-emerald-400" },
  { label: "Backlog", value: "backlog", color: "border-zinc-600/30 text-zinc-500" },
];

const PRIORITIES: { label: string; value?: IssuePriority; color: string }[] = [
  { label: "All Priorities", value: undefined, color: "text-text-muted" },
  { label: "Urgent", value: "urgent", color: "text-red-400" },
  { label: "High", value: "high", color: "text-amber-400" },
  { label: "Medium", value: "medium", color: "text-yellow-400" },
  { label: "Low", value: "low", color: "text-blue-400" },
];

export function IssueFilterBar({
  filters,
  onSetFilter,
  onClearFilters,
  activeFilterCount,
  onOpenCreateModal,
}: IssueFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative min-w-[260px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={filters.search || ""}
            onChange={(e) => onSetFilter("search", e.target.value)}
            placeholder="Search by title, description or number..."
            className="h-8.5 bg-background pl-9 pr-8 text-xs placeholder:text-text-muted/70"
            data-testid="issues-search-input"
          />
          {filters.search && (
            <button
              onClick={() => onSetFilter("search", "")}
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
              className="h-8.5 rounded-lg border border-border bg-background px-2.5 pr-7 text-xs font-medium text-text shadow-sm focus:border-primary focus:outline-none"
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
              className="h-8.5 gap-1.5 px-2.5 text-xs text-text-muted hover:border-red-500/30 hover:text-red-400"
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
            className="h-8.5 gap-1.5 px-3 text-xs shadow-sm shadow-primary/25"
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
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-150",
                isActive
                  ? "shadow-xs border-primary bg-primary/10 text-primary"
                  : "border-border bg-background/50 text-text-muted hover:border-border/80 hover:bg-background hover:text-text"
              )}
              data-testid={`status-chip-${chip.value || "all"}`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
