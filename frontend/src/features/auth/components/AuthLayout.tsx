import React from "react";
import { Bug, CheckCircle2, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-[#262626] bg-[#0A0A0A] p-12 text-[#FAFAFA] lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#FAFAFA_1px,transparent_1px),linear-gradient(to_bottom,#FAFAFA_1px,transparent_1px)] [background-size:40px_40px]"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#FF0000]/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#FF0000] text-[#000000]">
            <Bug className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">BugSense</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#FF6B6B]">
            Issue tracking, refined
          </p>
          <h2 className="mt-4 text-[38px] font-semibold leading-[1.08] tracking-[-0.03em]">
            The calmest way to run an engineering queue.
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-[#FAFAFA]/65">
            Structured AI triage, duplicate detection, and a board that keeps up with your team —
            without the tab sprawl.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "AI triage fills the ticket in seconds",
              "Duplicates caught before they are filed",
              "Keyboard-first from day one",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13px]">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#FF6B6B]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-lg border border-[#FAFAFA]/15 bg-[#FAFAFA]/5 p-4">
          <p className="text-[12px] leading-relaxed text-[#FAFAFA]/80">
            “We replaced three tools with BugSense. Filing a bug now takes less time than writing
            it down.”
          </p>
          <p className="mt-2 text-[11px] text-[#FF6B6B]">Sarah Chen · Engineering Lead</p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col bg-background px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:invisible">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Bug className="h-4 w-4" />
            </span>
            <span className="text-[14px] font-semibold tracking-tight">BugSense</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-8 w-8 text-text-muted hover:text-text"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-text">{title}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>

        <p className="text-center text-[11px] text-text-muted">
          © {new Date().getFullYear()} BugSense · Built for engineering teams
        </p>
      </main>
    </div>
  );
}
