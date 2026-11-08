import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import type { AIDuplicateCandidate } from "../../types";

interface AIDuplicateBannerProps {
  candidates: AIDuplicateCandidate[];
  onSelectDuplicate?: (candidate: AIDuplicateCandidate) => void;
  onDismiss: () => void;
}

export function AIDuplicateBanner({
  candidates,
  onSelectDuplicate,
  onDismiss,
}: AIDuplicateBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!candidates || candidates.length === 0) return null;

  return (
    <div
      className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-text shadow-sm transition-all"
      data-testid="ai-duplicate-banner"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="font-medium text-amber-300">
            {candidates.length} similar issue{candidates.length > 1 ? "s" : ""} found
          </span>
          <span className="text-[11px] text-amber-200/80">
            (Check before creating a duplicate)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20"
            data-testid="ai-duplicate-toggle"
          >
            {isExpanded ? (
              <>
                Hide <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Review ({candidates.length}) <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-1 text-amber-400/80 hover:bg-amber-500/20 hover:text-amber-300"
            aria-label="Dismiss similar issues alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2.5 divide-y divide-amber-500/15 border-t border-amber-500/20 pt-2">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0"
              data-testid={`duplicate-item-${cand.key}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-primary">
                  {cand.key}
                </span>
                <span className="truncate text-xs text-text font-normal">
                  {cand.title}
                </span>
                <span className="rounded bg-surface px-1.5 py-0.2 font-mono text-[10px] text-text-muted">
                  {cand.status}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2 pl-2">
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  {Math.round(cand.similarity * 100)}% match
                </span>

                <a
                  href={`/issues/${cand.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
                >
                  View
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>

                {onSelectDuplicate && (
                  <button
                    type="button"
                    onClick={() => onSelectDuplicate(cand)}
                    className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-200 hover:bg-amber-500/30"
                  >
                    Mark as duplicate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
