import React from "react";
import { Bug, Sparkles, Sun, Moon, ShieldAlert, Cpu, ArrowUpRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen w-full bg-background text-text">
      {/* Left Form Pane */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Bug className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-text">
              BugSense <span className="text-primary">AI</span>
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 text-text-muted hover:text-text"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Center Form */}
        <div className="mx-auto w-full max-w-sm py-8">
          <div className="mb-6 space-y-1.5 text-left">
            <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
            <p className="text-xs leading-relaxed text-text-muted">{subtitle}</p>
          </div>

          {children}
        </div>

        {/* Footer */}
        <div className="text-left text-[11px] text-text-muted">
          &copy; {new Date().getFullYear()} BugSense AI. Intelligent bug tracking engineered for
          speed.
        </div>
      </div>

      {/* Right Showcase Pane (Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-l border-border bg-surface p-12 lg:flex">
        {/* Ambient Gradient Glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />

        {/* Header Tag */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated/70 px-3 py-1 text-xs font-medium text-text-muted backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            Powered by Gemini Intelligence
          </div>
        </div>

        {/* Mock Product Preview Card */}
        <div className="relative z-10 mx-auto my-auto w-full max-w-md">
          <div className="rounded-xl border border-border/80 bg-surface-elevated/90 p-5 shadow-xl backdrop-blur-md transition-all hover:border-primary/40">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">BUG-108</span>
                <span className="inline-flex items-center gap-1 rounded border border-danger/20 bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                  <ShieldAlert className="h-2.5 w-2.5" /> Critical
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400">
                <Sparkles className="h-3 w-3" /> Auto-Triaged
              </span>
            </div>

            {/* Issue Title */}
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-text">
                Postgres pgvector connection pool exhausted under concurrent embedding search
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">
                Worker timeout spikes observed when batching embeddings larger than 768 dimensions
                without active connection pooling.
              </p>
            </div>

            {/* AI Suggestion Box */}
            <div className="mt-4 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-purple-400">
                <Cpu className="h-3.5 w-3.5" />
                AI Triage Recommendation
              </div>
              <p className="leading-normal text-text-muted">
                Suggested duplicate match (94% confidence) with{" "}
                <span className="font-mono text-text">BUG-092</span>. Recommended assignee:{" "}
                <span className="font-medium text-text">Backend Team</span>.
              </p>
            </div>

            {/* Bottom Meta */}
            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-text-muted">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                  ME
                </span>
                <span>Alex Developer</span>
              </div>
              <span className="flex cursor-pointer items-center gap-0.5 text-primary hover:underline">
                View in Board <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="relative z-10 flex flex-wrap gap-2 text-xs text-text-muted">
          <span className="rounded-md border border-border bg-surface-elevated/50 px-2.5 py-1">
            ⚡ 50ms Optimistic UI
          </span>
          <span className="rounded-md border border-border bg-surface-elevated/50 px-2.5 py-1">
            🔍 Semantic Duplicate Radar
          </span>
          <span className="rounded-md border border-border bg-surface-elevated/50 px-2.5 py-1">
            ⌘ Keyboard-first navigation
          </span>
        </div>
      </div>
    </div>
  );
}
