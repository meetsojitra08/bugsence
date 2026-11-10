import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  GitBranch,
  Loader2,
  Moon,
  Pause,
  Play,
  Sparkles,
  Sun,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTheme } from "@/hooks/useTheme";
import { BrandMark } from "@/components/common/BrandMark";
import { PriorityIcon } from "@/features/issues/components/PriorityIcon";
import {
  BENEFITS,
  DEMO_STAGES,
  NAV_ITEMS,
  RAW_REPORT_SAMPLE,
  STRUCTURED_TICKET_SAMPLE,
} from "./content";

function InteractiveTriageDemo() {
  const [stageIndex, setStageIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setStageIndex((prev) => (prev + 1) % DEMO_STAGES.length);
    }, 3333);
    return () => window.clearInterval(timer);
  }, [paused]);

  const activeStage = DEMO_STAGES[stageIndex];

  return (
    <div
      id="demo"
      className="rounded-xl border border-border bg-surface shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Top chrome & 3-step selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-surface-subtle/60 px-4 py-2.5">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Demo workflow stages">
          {DEMO_STAGES.map((stage, idx) => {
            const active = idx === stageIndex;
            return (
              <button
                key={stage.step}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStageIndex(idx);
                  setPaused(true);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "text-text-muted hover:bg-surface-hover hover:text-text"
                }`}
              >
                {stage.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
          aria-label={paused ? "Resume 10 second demo loop" : "Pause 10 second demo loop"}
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? "Play" : "Looping (10s)"}
        </button>
      </div>

      {/* Progress indicator */}
      <div className="grid grid-cols-3 gap-0.5 bg-border/40 px-4 pt-2">
        {DEMO_STAGES.map((stage, idx) => (
          <div
            key={stage.step}
            className={`h-0.5 rounded-full transition-colors duration-300 ${
              idx <= stageIndex ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Stage body */}
      <div className="p-5">
        <p className="mb-3 text-xs font-medium text-text-muted">{activeStage.caption}</p>

        {activeStage.step === "paste" && (
          <div className="space-y-3 rounded-lg border border-border bg-surface-subtle/50 p-4">
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span className="font-mono uppercase tracking-wider">Capture · Raw paste</span>
              <span className="inline-flex items-center gap-1 text-accent">
                <Sparkles className="h-3 w-3" /> Preparing triage…
              </span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-text">
              {RAW_REPORT_SAMPLE}
            </pre>
          </div>
        )}

        {activeStage.step === "triaged" && (
          <div className="space-y-3 rounded-lg border border-accent/30 bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Drafted from report
              </span>
              <span className="rounded bg-surface-subtle px-2 py-0.5 font-mono text-[11px] text-text-muted">
                No duplicates found
              </span>
            </div>

            <div className="text-sm font-semibold text-text">
              {STRUCTURED_TICKET_SAMPLE.title}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded border border-border bg-surface-subtle px-2 py-0.5 text-text">
                {STRUCTURED_TICKET_SAMPLE.type}
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-border bg-surface-subtle px-2 py-0.5 text-text">
                <PriorityIcon priority="high" />
                {STRUCTURED_TICKET_SAMPLE.priority}
              </span>
              <span className="rounded border border-border bg-surface-subtle px-2 py-0.5 text-text-muted">
                {STRUCTURED_TICKET_SAMPLE.environment}
              </span>
            </div>

            <ol className="list-decimal space-y-1 pl-4 text-xs text-text-muted">
              {STRUCTURED_TICKET_SAMPLE.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {activeStage.step === "assigned" && (
          <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-accent">
                  {STRUCTURED_TICKET_SAMPLE.key}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <Check className="h-3 w-3" /> Accepted to Todo
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-text">
                <UserCheck className="h-3.5 w-3.5 text-accent" />
                Assigned to {STRUCTURED_TICKET_SAMPLE.assignee}
              </span>
            </div>

            <p className="text-sm font-medium text-text">{STRUCTURED_TICKET_SAMPLE.title}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <GitBranch className="h-3.5 w-3.5" />
                fix/web-48-checkout-gift-card
              </span>
              <span>Reporter notified on resolution</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LandingPage() {
  const { isAuthenticated, startDemo } = useAuth();
  const { setCurrentProjectId } = useProjectStore();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [startingDemo, setStartingDemo] = useState(false);

  const handleTryDemo = async () => {
    setStartingDemo(true);
    try {
      const demoProject = await startDemo();
      if (demoProject?.id) {
        setCurrentProjectId(demoProject.id);
      }
      navigate("/today");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not launch the demo project right now.";
      toast.error(message);
    } finally {
      setStartingDemo(false);
    }
  };

  const primaryCtaButton = (
    <button
      type="button"
      onClick={handleTryDemo}
      disabled={startingDemo}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
    >
      {startingDemo ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing demo…
        </>
      ) : (
        <>
          Try the demo workspace
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-text antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1140px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="shrink-0">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-6 text-xs font-medium text-text-muted md:flex">
            {NAV_ITEMS.map((item) => (
              <a key={item.id} href={item.href} className="transition-colors hover:text-text">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {isAuthenticated ? (
              <Link
                to="/today"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                Open app
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                Sign in
              </Link>
            )}

            <button
              type="button"
              onClick={handleTryDemo}
              disabled={startingDemo}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {startingDemo ? "Loading…" : "Try the demo workspace"}
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1140px] px-4 pb-16 pt-12 sm:px-6 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="space-y-5">
              <h1 className="text-3xl font-bold tracking-tight text-text sm:text-5xl sm:leading-[1.1]">
                Messy bug report in. Clear ticket out.
              </h1>

              <p className="max-w-lg text-base leading-relaxed text-text-muted">
                Built for small dev teams of 2–15 engineers. Drop in raw stack traces, customer
                emails, or Slack threads and get clean repro steps, duplicate detection, and a calm
                triage inbox without setup ceremony.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                {primaryCtaButton}
                <Link
                  to={isAuthenticated ? "/today" : "/login"}
                  className="text-sm font-medium text-text-muted underline-offset-4 hover:text-text hover:underline"
                >
                  {isAuthenticated ? "Go to your project" : "Sign in to existing project"}
                </Link>
              </div>
              <p className="text-xs text-text-muted">
                No signup required to explore the demo project with sample bugs, GitHub links, and
                team triage.
              </p>
            </div>

            <InteractiveTriageDemo />
          </div>
        </section>

        {/* Before / After comparison */}
        <section
          id="comparison"
          className="border-y border-border bg-surface-subtle/40 py-14"
        >
          <div className="mx-auto max-w-[1140px] px-4 sm:px-6">
            <div className="mb-8 max-w-xl space-y-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent">
                Before &amp; After
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-text">
                Stop translating vague reports by hand
              </h2>
              <p className="text-sm text-text-muted">
                Keep the original report attached for reference while working from an editable,
                reproducible ticket.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="mb-3 flex items-center justify-between text-xs font-medium text-text-muted">
                  <span>Before · Incoming report</span>
                  <span className="font-mono text-[11px]">Email / Stack trace</span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/70 bg-surface-subtle/60 p-3.5 font-mono text-xs leading-relaxed text-text-muted">
                  {RAW_REPORT_SAMPLE}
                </pre>
              </div>

              <div className="rounded-xl border border-accent/30 bg-surface p-5">
                <div className="mb-3 flex items-center justify-between text-xs font-medium text-text">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-accent">{STRUCTURED_TICKET_SAMPLE.key}</span>
                    <span className="text-[10px] font-normal text-text-muted">
                      After · AI structured draft
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-surface-subtle px-2 py-0.5 text-[11px] text-text">
                    <PriorityIcon priority="high" />
                    {STRUCTURED_TICKET_SAMPLE.priority}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-text">
                  {STRUCTURED_TICKET_SAMPLE.title}
                </h3>
                <div className="mt-3 space-y-2.5 text-xs text-text-muted">
                  <div>
                    <span className="font-semibold text-text">Drafted steps (editable):</span>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                      {STRUCTURED_TICKET_SAMPLE.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <p>
                    <span className="font-semibold text-text">Expected:</span>{" "}
                    {STRUCTURED_TICKET_SAMPLE.expected}
                  </p>
                  <p>
                    <span className="font-semibold text-text">Actual:</span>{" "}
                    {STRUCTURED_TICKET_SAMPLE.actual}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    <span className="rounded bg-surface-subtle px-2 py-0.5 text-text">
                      Assignee: {STRUCTURED_TICKET_SAMPLE.assignee}
                    </span>
                    <span className="rounded bg-surface-subtle px-2 py-0.5 text-text">
                      Reporter: {STRUCTURED_TICKET_SAMPLE.reporter}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three core benefits */}
        <section id="benefits" className="mx-auto max-w-[1140px] px-4 py-16 sm:px-6">
          <div className="mb-8 max-w-xl space-y-2">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent">
              Why teams switch
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-text">
              Focused on intake, triage, and shipping fixes
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article
                  key={benefit.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5"
                >
                  <div>
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-base font-semibold text-text">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">
                      {benefit.description}
                    </p>
                  </div>
                  <p className="mt-4 border-t border-border/60 pt-3 font-mono text-[11px] text-text-muted">
                    {benefit.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border bg-surface-subtle/40 py-14">
          <div className="mx-auto flex max-w-[1140px] flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
                See how BugSense feels with real sample bugs
              </h2>
              <p className="text-sm text-text-muted">
                Explore Inbox triage, the 4-column Board, and GitHub PR automation immediately.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {primaryCtaButton}
              {!isAuthenticated && (
                <Link
                  to="/register"
                  className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text hover:bg-surface-hover"
                >
                  Create account
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-xs text-text-muted">
        <div className="mx-auto flex max-w-[1140px] flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span>© {new Date().getFullYear()} BugSense · MIT License</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/meetsojitra08/bugsence"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-text"
            >
              GitHub <ArrowUpRight className="h-3 w-3" />
            </a>
            <Link to="/login" className="hover:text-text">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-text">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
