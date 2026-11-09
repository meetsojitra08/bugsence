import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, RotateCcw, ChevronDown, ChevronUp, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAITriage } from "../../hooks/useAI";
import type { AITriageResult } from "../../types";

interface AITriageCardProps {
  projectId: string;
  onTriageApplied: (result: AITriageResult) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function AITriageCard({
  projectId,
  onTriageApplied,
  onUndo,
  canUndo,
}: AITriageCardProps) {
  const [rawText, setRawText] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRootCause, setShowRootCause] = useState(true);
  const [appliedResult, setAppliedResult] = useState<AITriageResult | null>(null);

  const triageMutation = useAITriage();

  const handleAutoFill = useCallback(async () => {
    if (!rawText.trim()) return;
    try {
      const result = await triageMutation.mutateAsync({
        projectId,
        rawText: rawText.trim(),
      });
      setAppliedResult(result);
      onTriageApplied(result);
    } catch {
      // Error handled by triageMutation.error
    }
  }, [rawText, projectId, triageMutation, onTriageApplied]);

  // Keyboard shortcut Cmd+J / Ctrl+J
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        if (rawText.trim().length >= 5 && !triageMutation.isPending) {
          handleAutoFill();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rawText, triageMutation.isPending, handleAutoFill]);

  const handleUndo = () => {
    setAppliedResult(null);
    onUndo();
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-b from-accent/10 via-surface to-surface p-3.5 shadow-sm transition-all"
      data-testid="ai-triage-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/20 text-accent">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-text">AI Smart Triage</h3>
            <p className="text-[11px] text-text-muted">
              Paste stack trace, log, or user feedback to auto-populate fields
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {appliedResult && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success"
              data-testid="ai-confidence-chip"
            >
              <Sparkles className="h-2.5 w-2.5" />
              {Math.round(appliedResult.confidence * 100)}% confidence
            </span>
          )}

          {canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-text-muted hover:bg-background hover:text-text"
              data-testid="ai-undo-button"
            >
              <RotateCcw className="h-3 w-3" />
              Undo
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-text-muted hover:bg-background hover:text-text"
            aria-label={isExpanded ? "Collapse AI triage" : "Expand AI triage"}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2.5">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste raw error message, traceback, or customer complaint here..."
            rows={3}
            disabled={triageMutation.isPending}
            className={`w-full rounded-lg border border-border bg-background/80 p-2 text-xs text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none ${
              triageMutation.isPending ? "animate-pulse bg-accent/5" : ""
            }`}
            data-testid="ai-triage-raw-input"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-text-muted">
              Shortcut: <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">Cmd+J</kbd>
            </span>

            <Button
              type="button"
              size="sm"
              onClick={handleAutoFill}
              disabled={rawText.trim().length < 5 || triageMutation.isPending}
              className="h-7 gap-1.5 px-3 text-xs"
              data-testid="ai-autofill-button"
            >
              {triageMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Triaging with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Auto-fill with AI
                </>
              )}
            </Button>
          </div>

          {/* Failure message with retry */}
          {triageMutation.isError && (
            <div
              className="flex items-center justify-between rounded-lg border border-danger/25 bg-danger/10 p-2 text-xs text-danger"
              data-testid="ai-triage-error"
            >
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {triageMutation.error instanceof Error
                    ? triageMutation.error.message
                    : "Failed to triage bug report."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="font-medium underline hover:text-danger"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Possible root cause hint card */}
          {appliedResult?.possible_root_cause && (
            <div
              className="rounded-lg border border-warning/25 bg-warning/10 p-2 text-xs text-text"
              data-testid="ai-root-cause-hint"
            >
              <div className="flex items-center justify-between font-medium text-warning">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Possible Root Cause (AI Hint)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRootCause(!showRootCause)}
                  className="text-text-muted hover:text-text"
                >
                  {showRootCause ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
              {showRootCause && (
                <p className="mt-1.5 text-xs text-text-muted">
                  {appliedResult.possible_root_cause}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
