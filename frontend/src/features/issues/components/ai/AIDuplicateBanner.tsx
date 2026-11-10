import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Link2, X } from "lucide-react";
import { pluralize } from "@/lib/format";
import type { AIDuplicateCandidate } from "../../types";

interface AIDuplicateBannerProps {
  candidates: AIDuplicateCandidate[];
  linkedDuplicate?: AIDuplicateCandidate | null;
  onSelectDuplicate?: (candidate: AIDuplicateCandidate) => void;
  onDismiss: () => void;
  projectKey?: string;
}

export function AIDuplicateBanner({
  candidates,
  linkedDuplicate,
  onSelectDuplicate,
  onDismiss,
  projectKey,
}: AIDuplicateBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!candidates || candidates.length === 0) return null;

  const top = candidates[0];
  const topPct = Math.round(top.similarity * 100);
  const effectiveKey = projectKey?.toLowerCase() || "";

  return (
    <div
      className="overflow-hidden rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-xs text-text transition-all"
      data-testid="ai-duplicate-banner"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
          <span className="truncate font-medium text-text">
            {linkedDuplicate ? (
              <>
                Linked as duplicate of{" "}
                <span className="font-mono font-semibold text-accent">{linkedDuplicate.key}</span>
              </>
            ) : (
              <>
                Looks similar to{" "}
                <span className="font-mono font-semibold text-accent">{top.key}</span> ({topPct}%)
                {candidates.length > 1 && (
                  <span className="ml-1 text-text-muted">
                    · {pluralize(candidates.length, "similar issue")} found
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[11px]">
          {effectiveKey && (
            <Link
              to={`/p/${effectiveKey}/issues/${top.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
            >
              View <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          )}
          {onSelectDuplicate && !linkedDuplicate && (
            <button
              type="button"
              onClick={() => onSelectDuplicate(top)}
              className="inline-flex items-center gap-1 rounded bg-warning/20 px-2 py-0.5 font-medium text-warning hover:bg-warning/30"
              data-testid="duplicate-link-btn"
            >
              <Link2 className="h-3 w-3" />
              Link
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="font-medium text-text-muted hover:text-text"
            data-testid="duplicate-dismiss-btn"
          >
            It&apos;s different
          </button>
          {candidates.length > 1 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-text-muted hover:bg-warning/20 hover:text-text"
              data-testid="ai-duplicate-toggle"
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-0.5 text-text-muted hover:bg-warning/20 hover:text-text"
            aria-label="Dismiss duplicate suggestion"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isExpanded && candidates.length > 1 && (
        <div className="mt-2 divide-y divide-warning/15 border-t border-warning/25 pt-2">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0"
              data-testid={`duplicate-item-${cand.key}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-accent">{cand.key}</span>
                <span className="truncate text-xs text-text">{cand.title}</span>
                <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                  {cand.status}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-2">
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
                  {Math.round(cand.similarity * 100)}% match
                </span>
                {effectiveKey && (
                  <Link
                    to={`/p/${effectiveKey}/issues/${cand.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-accent hover:underline"
                  >
                    View <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                )}
                {onSelectDuplicate && (
                  <button
                    type="button"
                    onClick={() => onSelectDuplicate(cand)}
                    className="rounded bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning hover:bg-warning/30"
                  >
                    Link
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
