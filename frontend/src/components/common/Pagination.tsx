import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
  className,
}: PaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotal);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3 text-[11px]", className)}
      data-testid="pagination"
    >
      <span className="tabular-nums text-text-muted">
        {typeof totalCount === "number" ? `${totalCount} issues` : `Page ${safePage}`}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 font-medium text-text transition-colors hover:bg-surface-elevated disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous page"
          data-testid="pagination-prev"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span className="px-1 font-medium tabular-nums text-text-muted" data-testid="pagination-status">
          {safePage} / {safeTotal}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotal}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 font-medium text-text transition-colors hover:bg-surface-elevated disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next page"
          data-testid="pagination-next"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}
