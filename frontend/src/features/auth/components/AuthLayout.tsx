import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bug,
  GitPullRequest,
  Inbox,
  Layers,
  Loader2,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useProjectStore } from "@/stores/useProjectStore";
import { PriorityIcon } from "@/features/issues/components/PriorityIcon";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  inviteNotice?: string | null;
  hideDemoCta?: boolean;
}

const HIGHLIGHTS = [
  {
    icon: Inbox,
    title: "Inbox with AI triage",
    text: "Turn messy traces, emails, and Slack threads into structured tickets with steps to reproduce.",
  },
  {
    icon: Layers,
    title: "Duplicate detection",
    text: "Spot similar existing bugs as you type and merge reports instead of cluttering the board.",
  },
  {
    icon: GitPullRequest,
    title: "GitHub and Slack built in",
    text: "Move issues from In Review to Done via PR webhooks and capture bugs directly with /bug.",
  },
];

export function AuthLayout({
  children,
  title,
  subtitle,
  inviteNotice,
  hideDemoCta = false,
}: AuthLayoutProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { startDemo } = useAuth();
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId);
  const navigate = useNavigate();
  const [startingDemo, setStartingDemo] = useState(false);

  const handleTryDemo = async () => {
    setStartingDemo(true);
    try {
      const project = await startDemo();
      if (project?.id) {
        setCurrentProjectId(project.id);
      }
      navigate("/today");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not launch the demo project.");
    } finally {
      setStartingDemo(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background text-text lg:grid-cols-[1.05fr_1fr]">
      {/* Left Context Panel (matches redesigned LandingPage palette & product truth) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-10 xl:p-14 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:40px_40px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-xs">
              <Bug className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-text">BugSense</span>
          </Link>
          <span className="rounded-full border border-border bg-background/70 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
            For teams of 2–15
          </span>
        </div>

        <div className="relative max-w-lg space-y-6">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              Intake to fix
            </p>
            <h2 className="mt-2.5 text-3xl font-bold leading-[1.12] tracking-tight text-text xl:text-[34px]">
              Messy bug report in. Clear ticket out.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              A calm, keyboard-first bug tracker designed so small engineering teams spend time
              fixing issues, not grooming tickets.
            </p>
          </div>

          {/* Real Product Preview Card (no fabricated stats or fake quotes) */}
          <div className="rounded-xl border border-border bg-background/90 p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5 text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-medium text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Capture preview
              </span>
              <span className="font-mono text-text-muted">WEB-48 · Bug</span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-md border border-border/70 bg-surface px-3 py-2 font-mono text-[11px] text-text-muted">
                TypeError: Cannot read &apos;cardBrand&apos; at CheckoutForm.tsx:142
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="truncate text-xs font-semibold text-text">
                  Checkout crashes when applying gift card after removing coupon
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-text">
                  <PriorityIcon priority="high" />
                  High
                </span>
              </div>
            </div>
          </div>

          <ul className="space-y-3 pt-1">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-accent">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-text">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative flex items-center justify-between border-t border-border/70 pt-4 text-[11px] text-text-muted">
          <span>Open source · MIT License</span>
          <Link to="/" className="inline-flex items-center gap-1 hover:text-text">
            Overview &amp; live demo <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      {/* Right Auth Form Column */}
      <main className="flex flex-col justify-between px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-xs">
                <Bug className="h-4 w-4" />
              </span>
              <span className="text-[14px] font-semibold tracking-tight text-text">BugSense</span>
            </Link>
            <Link
              to="/"
              className="hidden items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text lg:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-8">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-7">
            {inviteNotice && (
              <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-text">
                {inviteNotice}
              </div>
            )}

            <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{subtitle}</p>

            <div className="mt-6">{children}</div>

            {!hideDemoCta && (
              <div className="mt-5 border-t border-border/70 pt-4">
                <button
                  type="button"
                  onClick={handleTryDemo}
                  disabled={startingDemo}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-text transition-colors hover:bg-surface-hover disabled:opacity-60"
                  data-testid="auth-try-demo-btn"
                >
                  {startingDemo ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Preparing demo project…
                    </>
                  ) : (
                    <>
                      Try the demo workspace without signing up
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-text-muted">
          © {new Date().getFullYear()} BugSense · Built for small dev teams
        </p>
      </main>
    </div>
  );
}
