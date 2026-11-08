import { useState } from "react";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, AlertCircle, HelpCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSummarizeIssue } from "../../hooks/useAI";

interface AISummaryCardProps {
  issueId: string;
  initialSummary?: string;
}

export function AISummaryCard({ issueId, initialSummary }: AISummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    data: summary,
    isLoading,
    isError,
    error,
    regenerate,
    isRegenerating,
  } = useSummarizeIssue(issueId);

  const tldr = summary?.tldr || initialSummary;

  // Don't render empty card if no summary exists and not loading
  if (!isLoading && !tldr && !isError) {
    return null;
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-b from-primary/10 via-surface to-surface p-3.5 shadow-sm transition-all"
      data-testid="ai-summary-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-text">AI Thread Summary</h3>
            {summary?.is_stale && (
              <span
                className="rounded-full bg-amber-500/15 px-2 py-0.2 text-[10px] font-medium text-amber-300"
                data-testid="ai-summary-stale-badge"
              >
                Needs update
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => regenerate()}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/80 px-2 py-1 text-[11px] font-medium text-text-muted hover:border-primary/40 hover:text-text disabled:opacity-50"
            title="Regenerate summary with latest comments and status"
            data-testid="ai-summary-regenerate-button"
          >
            <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin text-primary" : ""}`} />
            <span>{isRegenerating ? "Regenerating..." : "Regenerate"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-text-muted hover:bg-background hover:text-text"
            aria-label={isExpanded ? "Collapse summary" : "Expand summary"}
            data-testid="ai-summary-toggle"
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {isLoading && !tldr && (
        <div className="mt-3 animate-pulse space-y-2">
          <div className="h-4 w-3/4 rounded bg-primary/10" />
          <div className="h-3 w-1/2 rounded bg-primary/5" />
        </div>
      )}

      {isError && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error instanceof Error ? error.message : "Failed to load summary"}</span>
        </div>
      )}

      {isExpanded && tldr && (
        <div className="mt-3 space-y-2.5 text-xs">
          {/* TL;DR */}
          <div className="rounded-lg bg-background/60 p-2.5 text-text leading-relaxed">
            <span className="font-semibold text-primary">TL;DR: </span>
            {tldr}
          </div>

          {/* Status + Open Questions + Next Steps */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {summary?.status && (
              <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  Current Status
                </span>
                <p className="mt-1 text-xs text-text">{summary.status}</p>
              </div>
            )}

            {summary?.next_steps && summary.next_steps.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
                  <ArrowRight className="h-3 w-3 text-primary" />
                  Next Steps
                </span>
                <ul className="mt-1 space-y-0.5 text-xs text-text">
                  {summary.next_steps.map((step, idx) => (
                    <li key={idx} className="truncate">
                      • {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {summary?.open_questions && summary.open_questions.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                <HelpCircle className="h-3 w-3" />
                Open Questions
              </span>
              <ul className="mt-1 space-y-0.5 text-xs text-text-muted">
                {summary.open_questions.map((q, idx) => (
                  <li key={idx}>• {q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
