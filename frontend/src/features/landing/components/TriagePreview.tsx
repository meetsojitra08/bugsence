import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Info, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRIAGE_PRESETS, type PresetPriority, type PresetSeverity } from "../content";

const RUN_STEPS = [
  "Reading the report",
  "Structuring fields with Gemini",
  "Checking the project for duplicates",
];

const PRIORITY_STYLES: Record<PresetPriority, string> = {
  urgent: "border-danger/30 bg-danger/10 text-danger",
  high: "border-warning/30 bg-warning/10 text-warning",
  medium: "border-border bg-surface-elevated text-text-muted",
  low: "border-border bg-surface-elevated text-text-muted",
};

const SEVERITY_STYLES: Record<PresetSeverity, string> = {
  critical: "border-danger/25 bg-danger/5 text-danger",
  major: "border-warning/25 bg-warning/5 text-warning",
  minor: "border-border bg-surface text-text-muted",
  trivial: "border-border bg-surface text-text-muted",
};

type Phase = "done" | "running";

/**
 * A faithful, non-functional preview of the in-app create-issue flow. It is
 * intentionally labelled as an example: the real form calls Gemini via
 * /api/v1/ai/triage/, while this runs entirely on built-in data.
 */
export function TriagePreview() {
  const [selected, setSelected] = useState(0);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<Phase>("done");
  const [step, setStep] = useState(RUN_STEPS.length);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const runPreview = useCallback(
    (index: number) => {
      clearTimers();
      setSelected(index);
      setPhase("running");
      setStep(0);

      timers.current.push(window.setTimeout(() => setStep(1), 320));
      timers.current.push(window.setTimeout(() => setStep(2), 640));
      timers.current.push(window.setTimeout(() => setStep(3), 960));
      timers.current.push(
        window.setTimeout(() => {
          setShown(index);
          setPhase("done");
        }, 1180)
      );
    },
    [clearTimers]
  );

  const preset = TRIAGE_PRESETS[shown];
  const isRunning = phase === "running";

  return (
    <div className="relative" data-testid="ai-simulator">
      <div
        className="pointer-events-none absolute -inset-5 -z-10 rounded-[28px] bg-accent/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        {/* Sheet header */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-elevated/50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-text-muted">
              New issue
            </span>
            <span className="truncate font-mono text-[9.5px] text-text-muted/80">
              BUG · BugSense Core Web
            </span>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[8.5px] font-medium uppercase tracking-[0.12em] text-text-muted">
            Example
          </span>
        </div>

        <div className="p-3.5 sm:p-4">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[10px] text-text-muted">Try a report</span>
            {TRIAGE_PRESETS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => runPreview(index)}
                aria-pressed={selected === index}
                data-testid={`preset-btn-${index}`}
                className={cn(
                  "rounded-md border px-2 py-1 text-[10.5px] font-medium transition-colors duration-150",
                  selected === index
                    ? "border-accent/35 bg-accent/10 text-accent"
                    : "border-border bg-surface text-text-muted hover:border-text-muted/30 hover:text-text"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Raw report */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="triage-preview-report"
                className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-text-muted"
              >
                Raw report
              </label>
              <span className="font-mono text-[9px] text-text-muted/70">
                {preset.report.length} chars
              </span>
            </div>
            <textarea
              id="triage-preview-report"
              value={preset.report}
              readOnly
              rows={3}
              aria-label="Sample bug report"
              data-testid="ai-simulator-textarea"
              className="w-full resize-none rounded-lg border border-border bg-background p-2.5 font-mono text-[10.5px] leading-relaxed text-text-muted focus:outline-none"
            />
          </div>

          {/* Action row */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[9.5px] text-text-muted">
              <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
              No API call in this preview
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => runPreview(selected)}
              disabled={isRunning}
              className="h-7 gap-1.5 px-2.5 text-[11px]"
              data-testid="run-ai-simulation-btn"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Previewing
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Re-run preview
                </>
              )}
            </Button>
          </div>

          {/* Structured draft */}
          <div
            className="relative mt-3 overflow-hidden rounded-lg border border-border bg-background"
            aria-busy={isRunning}
          >
            <div
              className={cn(
                "h-0.5 w-full bg-border transition-opacity",
                isRunning ? "opacity-100" : "opacity-0"
              )}
              aria-hidden="true"
            >
              <div className="h-full w-1/3 animate-sweep bg-accent" />
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-text-muted">
                <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
                Structured draft
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-mono text-[9px]",
                  isRunning ? "text-text-muted" : "text-success"
                )}
                aria-live="polite"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                    {RUN_STEPS[Math.min(step, RUN_STEPS.length - 1)]}...
                  </>
                ) : (
                  <>
                    <Check className="h-2.5 w-2.5" aria-hidden="true" />
                    3 checks complete
                  </>
                )}
              </span>
            </div>

            <div
              className={cn(
                "p-3 transition-all duration-200",
                isRunning ? "pointer-events-none opacity-40 blur-[0.4px]" : "opacity-100"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className="text-[12.5px] font-semibold leading-snug text-text"
                  data-testid="simulated-title"
                >
                  {preset.result.title}
                </p>
                <span className="shrink-0 rounded-full border border-success/25 bg-success/10 px-1.5 py-0.5 font-mono text-[9px] font-medium text-success">
                  {preset.result.confidence}%
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-muted">
                  {preset.result.type}
                </span>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em]",
                    PRIORITY_STYLES[preset.result.priority]
                  )}
                >
                  {preset.result.priority}
                </span>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em]",
                    SEVERITY_STYLES[preset.result.severity]
                  )}
                >
                  {preset.result.severity}
                </span>
                {preset.result.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[8.5px] text-text-muted"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-2.5 grid grid-cols-[74px_1fr] gap-1.5">
                <div className="rounded border border-border bg-surface px-2 py-1.5">
                  <p className="text-[8px] uppercase tracking-[0.1em] text-text-muted">Steps</p>
                  <p className="mt-0.5 font-mono text-[10px] text-text">
                    {preset.result.steps} extracted
                  </p>
                </div>
                <div className="rounded border border-border bg-surface px-2 py-1.5">
                  <p className="text-[8px] uppercase tracking-[0.1em] text-text-muted">
                    Probable root cause
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-snug text-text-muted">
                    {preset.result.rootCause}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 rounded-md border border-warning/25 bg-warning/5 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[9.5px] font-medium text-warning">
                    <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />1 similar issue
                  </span>
                  <span className="font-mono text-[9px] font-semibold text-warning">
                    {preset.result.duplicate.similarity}% match
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="shrink-0 font-mono text-[9.5px] font-semibold text-text">
                    {preset.result.duplicate.key}
                  </span>
                  <span className="truncate text-[9.5px] text-text-muted">
                    {preset.result.duplicate.title}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-warning/20">
                  <div
                    className="h-full rounded-full bg-warning/70"
                    style={{ width: `${preset.result.duplicate.similarity}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 px-1 text-[10px] leading-relaxed text-text-muted">
        <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
        Illustrative preview. The in-app form calls Gemini with your project's labels and saves
        every field as editable.
      </p>
    </div>
  );
}
