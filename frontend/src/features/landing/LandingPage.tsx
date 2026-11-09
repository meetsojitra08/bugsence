import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bug,
  Check,
  ChevronDown,
  Copy,
  Github,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  CODE_SNIPPET,
  ENGINEERING_FACTS,
  FAQS,
  FEATURES,
  NAV_ITEMS,
  SCOPE_NEXT,
  SCOPE_SHIPPED,
  SHORTCUTS,
  STACK_GROUPS,
  WORKFLOW_STEPS,
  type Feature,
} from "./content";
import { ProductTour } from "./components/ProductTour";
import { Reveal } from "./components/Reveal";
import { TriagePreview } from "./components/TriagePreview";

const DEMO_PEOPLE = ["Demo Recruiter", "Sarah Chen", "Marcus Vance", "Elena Rostova"];

const AVATAR_TONES = [
  "bg-accent/15 text-accent",
  "bg-text/10 text-text",
  "bg-warning/15 text-warning",
  "bg-info/15 text-info",
];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="flex items-center gap-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
        <span className="h-px w-7 bg-accent/50" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-[clamp(1.85rem,4vw,2.7rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-text">
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-muted">{description}</p>
      )}
    </div>
  );
}

function FeatureVisual({ feature }: { feature: Feature }) {
  switch (feature.visual) {
    case "triage":
      return (
        <div className="mt-4 space-y-1.5">
          {[
            ["Title", "Token refresh race on concurrent calls"],
            ["Priority", "urgent"],
            ["Severity", "critical"],
            ["Labels", "security · frontend"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/70 px-2.5 py-1.5"
            >
              <span className="text-[9px] uppercase tracking-[0.1em] text-text-muted">{label}</span>
              <span
                className={cn(
                  "truncate text-[10px] font-medium",
                  value === "urgent" || value === "critical" ? "text-accent" : "text-text"
                )}
              >
                {value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-md border border-accent/20 bg-accent/[0.05] px-2.5 py-1.5">
            <span className="text-[9px] uppercase tracking-[0.1em] text-text-muted">
              Confidence
            </span>
            <span className="font-mono text-[10px] font-medium text-accent">96%</span>
          </div>
        </div>
      );

    case "duplicates":
      return (
        <div className="mt-4 space-y-2.5">
          {[
            ["BUG-14", "Silent token rotation failure on cross-tab expiry", 88],
            ["BUG-21", "Notification badge polls after logout", 74],
          ].map(([key, title, score]) => (
            <div key={key as string}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9.5px] font-semibold text-text">{key}</span>
                <span className="font-mono text-[9px] text-text-muted">{score}%</span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-text-muted">{title}</p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-border/70">
                <div
                  className={cn(
                    "h-full rounded-full",
                    Number(score) >= 80 ? "bg-warning/80" : "bg-text-muted/40"
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      );

    case "board":
      return (
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {[
            ["Todo", 2],
            ["Doing", 2],
            ["Review", 1],
          ].map(([label, count], columnIndex) => (
            <div
              key={label as string}
              className="rounded-md border border-border/80 bg-background/60 p-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-medium text-text-muted">{label}</span>
                <span className="font-mono text-[8px] text-text-muted/70">{count}</span>
              </div>
              <div className="mt-1.5 space-y-1">
                {Array.from({ length: count as number }).map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-5 rounded border border-border bg-surface",
                      columnIndex === 1 && index === 0 && "-rotate-2 border-accent/40 shadow-sm"
                    )}
                  >
                    <span className="mt-1 block h-0.5 w-3/4 rounded-full bg-text-muted/25" />
                    <span className="mt-0.5 block h-0.5 w-1/2 rounded-full bg-text-muted/15" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case "analytics":
      return (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-text-muted">Created vs resolved</span>
            <span className="font-mono text-[9px] text-text-muted">30d</span>
          </div>
          <svg viewBox="0 0 220 54" preserveAspectRatio="none" className="mt-1.5 h-12 w-full">
            <defs>
              <linearGradient id="feature-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 42 L18 38 L36 44 L54 30 L72 34 L90 22 L108 26 L126 14 L144 20 L162 12 L180 18 L198 8 L220 14 L220 54 L0 54 Z"
              fill="url(#feature-area)"
            />
            <path
              d="M0 42 L18 38 L36 44 L54 30 L72 34 L90 22 L108 26 L126 14 L144 20 L162 12 L180 18 L198 8 L220 14"
              fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="1.4"
            />
            <path
              d="M0 50 L18 48 L36 50 L54 44 L72 46 L90 40 L108 42 L126 36 L144 40 L162 34 L180 38 L198 30 L220 34"
              fill="none"
              stroke="hsl(var(--text-muted))"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.7"
            />
          </svg>
          <div className="mt-1 flex items-center justify-between font-mono text-[8.5px] text-text-muted">
            <span>open 14</span>
            <span>resolved 10</span>
            <span>overdue 2</span>
          </div>
        </div>
      );

    case "timeline":
      return (
        <div className="mt-4 space-y-2.5">
          {[
            ["SC", "Sarah moved status to In progress", "2h"],
            ["MV", "Marcus commented on the fix", "4h"],
            ["ER", "Elena verified on staging", "1d"],
          ].map(([initials, text, time]) => (
            <div key={text} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[7px] font-semibold text-text-muted">
                {initials}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-text-muted">{text}</span>
              <span className="font-mono text-[8.5px] text-text-muted/60">{time}</span>
            </div>
          ))}
        </div>
      );

    case "keys":
      return (
        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {SHORTCUTS.slice(0, 4).map((shortcut) => (
            <div
              key={shortcut.label}
              className="flex items-center gap-2 rounded-md border border-border bg-background/70 px-2 py-1.5"
            >
              <span className="flex shrink-0 gap-0.5">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-border bg-surface-elevated px-1 py-0.5 font-mono text-[8.5px] font-medium text-text"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
              <span className="truncate text-[9px] text-text-muted">{shortcut.label}</span>
            </div>
          ))}
        </div>
      );

    case "theme":
      return (
        <div className="mt-4 grid grid-cols-2 gap-1.5">
          <div className="rounded-md border border-border bg-[#F7F5F2] p-2.5">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#6B6560]">
              Light
            </span>
            <p className="mt-1 text-[13px] font-semibold tracking-tight text-[#0A0A0A]">Aa</p>
            <div className="mt-1.5 h-0.5 w-8 rounded-full bg-[#BC0202]" />
          </div>
          <div className="rounded-md border border-[#303030] bg-[#000000] p-2.5">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#A3A3A3]">
              Dark
            </span>
            <p className="mt-1 text-[13px] font-semibold tracking-tight text-[#F5F5F5]">Aa</p>
            <div className="mt-1.5 h-0.5 w-8 rounded-full bg-[#FF0000]" />
          </div>
        </div>
      );
  }
}

export function LandingPage() {
  const { isAuthenticated, loginAsDemo } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const root = document.documentElement;
      const max = root.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
      setScrolled(window.scrollY > 10);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => Boolean(element)
    );
    if (sections.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: [0, 0.15, 0.4] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const handleDemoClick = useCallback(async () => {
    setMobileOpen(false);
    if (!isAuthenticated) {
      await loginAsDemo();
    }
    navigate("/dashboard");
  }, [isAuthenticated, loginAsDemo, navigate]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CODE_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked; the snippet stays selectable.
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Scroll progress */}
      <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent" aria-hidden="true">
        <div
          className="h-full bg-accent transition-[width] duration-150 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-colors duration-300",
          scrolled
            ? "border-border bg-background/90 backdrop-blur-md"
            : "border-transparent bg-background/70 backdrop-blur-sm"
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-7">
            <Link
              to="/"
              className="flex items-center gap-2"
              aria-label="BugSense home"
              onClick={() => setMobileOpen(false)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-xs">
                <Bug className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-[14.5px] font-semibold tracking-tight">BugSense</span>
            </Link>

            <nav
              className="hidden items-center gap-0.5 md:flex"
              aria-label="Landing page sections"
            >
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  aria-current={activeSection === item.id ? "true" : undefined}
                  className={cn(
                    "relative rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                    activeSection === item.id
                      ? "text-text"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <span
                      className="absolute inset-x-2.5 -bottom-0.5 h-[1.5px] rounded-full bg-accent"
                      aria-hidden="true"
                    />
                  )}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <a
              href="https://github.com/meetsojitra08/bugsence"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-elevated hover:text-text sm:flex"
              aria-label="BugSense on GitHub"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
            </a>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="h-8 w-8 text-text-muted hover:text-text"
              aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden="true" />

            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                Open app
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-text-muted transition-colors hover:text-text sm:block"
                >
                  Sign in
                </Link>
                <Button
                  size="sm"
                  onClick={handleDemoClick}
                  className="hidden gap-1.5 sm:inline-flex"
                  data-testid="hero-try-demo-btn"
                >
                  Launch demo
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-muted hover:text-text md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-controls="landing-mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div
            id="landing-mobile-menu"
            className="animate-rise border-t border-border bg-background px-4 pb-5 pt-2 md:hidden"
          >
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between border-b border-border/70 py-3 text-[14px] font-medium text-text"
                >
                  {item.label}
                  <ArrowUpRight className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                </a>
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={handleDemoClick} className="w-full justify-between">
                Launch the live demo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/register">Create account</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute inset-0 bg-grid-fade opacity-[0.4] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_72%_62%_at_28%_0%,black,transparent)]" />
            <div className="absolute -right-40 -top-52 h-[520px] w-[520px] rounded-full bg-accent/[0.08] blur-3xl" />
            <div className="absolute -left-44 top-40 h-[360px] w-[360px] rounded-full bg-accent/[0.04] blur-3xl" />
            <div className="absolute inset-0 bg-grain opacity-[0.025]" />
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-12 lg:pb-20 lg:pt-20">
            <div className="animate-rise">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-[10.5px] font-medium text-text-muted shadow-xs backdrop-blur">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                AI-native issue tracking · v2.0
              </div>

              <h1 className="mt-6 text-[clamp(2.75rem,7.4vw,4.75rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-text">
                Paste the mess.
                <span className="mt-1 block">
                  Ship the{" "}
                  <span className="relative inline-block text-accent">
                    fix
                    <svg
                      viewBox="0 0 120 12"
                      preserveAspectRatio="none"
                      className="absolute -bottom-2 left-0 h-2.5 w-full overflow-visible"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 8.5C30 2.5 78 2 118 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="animate-draw"
                        style={{ strokeDasharray: 140, strokeDashoffset: 140 }}
                      />
                    </svg>
                  </span>
                  .
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-text-muted sm:text-[16px]">
                BugSense reads the stack trace, writes the ticket, and catches the duplicate
                before it exists — then keeps the fix moving on a board that never stutters.
              </p>

              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
                <Button
                  size="lg"
                  onClick={handleDemoClick}
                  className="group h-11 gap-2 px-5 shadow-card"
                  data-testid="hero-cta-demo"
                >
                  {isAuthenticated ? "Open your workspace" : "Launch the live demo"}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/register")}
                  className="h-11 px-5"
                >
                  Create free account
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-text-muted">
                {["No card required", "One-click demo", "MIT licensed"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/80 pt-5">
                <div className="flex -space-x-2">
                  {DEMO_PEOPLE.map((name) => (
                    <span
                      key={name}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-semibold ring-2 ring-background",
                        AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length]
                      )}
                      title={name}
                    >
                      {initialsOf(name)}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  The seeded demo workspace:{" "}
                  <span className="font-medium text-text">
                    4 teammates · 2 projects · 40+ issues
                  </span>
                </p>
              </div>
            </div>

            <div className="animate-rise [animation-delay:120ms]">
              <TriagePreview />
            </div>
          </div>

          {/* Stack strip */}
          <div className="relative border-t border-border bg-surface/30">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 text-[10.5px] text-text-muted sm:px-6">
              <span className="font-mono uppercase tracking-[0.18em] text-text-muted/80">
                Built on
              </span>
              {[
                "Django 5",
                "PostgreSQL 16 + pgvector",
                "Gemini",
                "React 18",
                "TypeScript",
                "Tailwind",
              ].map((item, index) => (
                <span key={item} className="flex items-center gap-5">
                  {index > 0 && <span className="h-3 w-px bg-border" aria-hidden="true" />}
                  <span className="font-medium text-text/80">{item}</span>
                </span>
              ))}
              <span className="ml-auto hidden font-mono text-[10px] text-text-muted/70 sm:block">
                github.com/meetsojitra08/bugsence
              </span>
            </div>
          </div>
        </section>

        {/* Product tour */}
        <section id="tour" className="scroll-mt-20 border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="Product tour"
                title="Look at the real thing."
                description="Four screens, drawn from the actual component structure and the seeded demo workspace. No invented dashboards, no lorem ipsum."
              />
              <p className="shrink-0 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
                app.bugsense.dev
              </p>
            </div>

            <div className="mt-10">
              <ProductTour onLaunchDemo={handleDemoClick} />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-b border-border bg-surface/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <SectionHeading
              eyebrow="The product"
              title="Seven things you will actually use."
              description="Not a platform with a thousand switches. A focused tracker where each surface earns its place — and the AI is measured, editable, and clearly labelled."
            />

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Reveal
                    key={feature.title}
                    delay={(index % 3) * 60}
                    className={cn("h-full", feature.span === "wide" && "lg:col-span-2")}
                  >
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-card motion-reduce:hover:translate-y-0">
                      <div className="flex items-start justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-accent transition-colors group-hover:border-accent/30">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <ArrowUpRight
                          className="h-4 w-4 -translate-y-0.5 text-text-muted/0 transition-all duration-300 group-hover:translate-y-0 group-hover:text-accent"
                          aria-hidden="true"
                        />
                      </div>

                      <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-text">
                        {feature.title}
                      </h3>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-muted">
                        {feature.body}
                      </p>

                      <FeatureVisual feature={feature} />

                      <p className="mt-auto pt-4 font-mono text-[9px] uppercase tracking-[0.1em] text-text-muted/70">
                        {feature.meta}
                      </p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="scroll-mt-20 border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <SectionHeading
                eyebrow="The loop"
                title="From rant to resolvable in four moves."
                description="The point isn't to remove the engineer from triage. It's to stop the engineer from doing data entry at 11pm."
              />

              <div className="grid gap-8 sm:grid-cols-2">
                {WORKFLOW_STEPS.map((step) => (
                  <div key={step.number} className="relative border-t border-border pt-5">
                    <span
                      className="absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-accent">
                      {step.number}
                    </span>
                    <h3 className="mt-2 text-[15px] font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-muted">
                      {step.body}
                    </p>
                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-text-muted/70">
                      {step.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Under the hood */}
        <section id="stack" className="scroll-mt-20 border-b border-border bg-surface/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
              <div>
                <SectionHeading
                  eyebrow="Under the hood"
                  title="Boring infrastructure. Interesting behaviour."
                  description="The intelligence is a small, typed surface on top of a conventional Django + PostgreSQL stack. Nothing magic, nothing hidden in a prompt you can't read."
                />

                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {ENGINEERING_FACTS.map((fact) => (
                    <li key={fact} className="flex items-start gap-2 text-[12px] text-text">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                      {fact}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 space-y-3">
                  {STACK_GROUPS.map((group) => (
                    <div key={group.label} className="flex flex-col gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted/70">
                        {group.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <span
                            key={item}
                            className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[9.5px] text-text-muted"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-4 text-[11.5px] font-medium">
                  <a
                    href="https://github.com/meetsojitra08/bugsence"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-text underline decoration-border underline-offset-4 transition-colors hover:decoration-accent"
                  >
                    <Github className="h-3.5 w-3.5" aria-hidden="true" />
                    Read the source
                  </a>
                  <a
                    href="https://github.com/meetsojitra08/bugsence/blob/main/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-text-muted transition-colors hover:text-text"
                  >
                    Setup guide
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="min-w-0">
                <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#0A0A0A] shadow-card">
                  <div className="flex items-center gap-2 border-b border-[#242424] px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-[#2E2E2E]" aria-hidden="true" />
                    <span className="h-2 w-2 rounded-full bg-[#2E2E2E]" aria-hidden="true" />
                    <span className="h-2 w-2 rounded-full bg-[#2E2E2E]" aria-hidden="true" />
                    <span className="ml-2 font-mono text-[9.5px] text-[#8A857E]">
                      backend/apps/ai · python
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="ml-auto inline-flex items-center gap-1.5 rounded border border-[#2A2A2A] bg-[#121212] px-2 py-1 font-mono text-[9px] text-[#B8B3AB] transition-colors hover:border-[#3A3A3A] hover:text-[#F5F5F5]"
                      aria-label="Copy the code snippet"
                    >
                      {copied ? (
                        <>
                          <Check className="h-2.5 w-2.5 text-[#6EE7A8]" aria-hidden="true" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-2.5 w-2.5" aria-hidden="true" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="overflow-x-auto p-4 font-mono text-[10px] leading-[1.75] sm:text-[10.5px]">
                    <code>
                      {CODE_SNIPPET.split("\n").map((line, index) => (
                        <span key={index} className="block whitespace-pre">
                          <span className="mr-3 inline-block w-4 select-none text-right text-[#4A4742]">
                            {index + 1}
                          </span>
                          <span
                            className={
                              line.trimStart().startsWith("#")
                                ? "text-[#7C7770]"
                                : "text-[#D8D3CB]"
                            }
                          >
                            {line || " "}
                          </span>
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="text-[10.5px] leading-relaxed text-text-muted">
                    Real excerpts from{" "}
                    <span className="font-mono text-text">apps/ai/services/duplicates.py</span> and{" "}
                    <span className="font-mono text-text">apps/ai/schemas.py</span>.
                  </p>
                  <span className="shrink-0 rounded-full border border-accent/25 bg-accent/[0.06] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-accent">
                    MIT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Honest scope */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="Scope"
                title="What is in the box, and what is not."
                description="A landing page should tell you what you are actually getting. Here is the honest split for this build."
              />
              <p className="shrink-0 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
                v2.0 · shipped
              </p>
            </div>

            <div className="mt-10 grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
              <Reveal>
                <div className="relative h-full overflow-hidden rounded-xl border border-accent/25 bg-surface p-6">
                  <span
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent/60 via-accent/20 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                      In this build
                    </h3>
                    <span className="font-mono text-[10px] text-accent">
                      {String(SCOPE_SHIPPED.length).padStart(2, "0")}
                    </span>
                  </div>

                  <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {SCOPE_SHIPPED.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                          aria-hidden="true"
                        />
                        <span className="text-text">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <div className="h-full rounded-xl border border-dashed border-border bg-background/40 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-text-muted">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-text-muted/60" />
                      </span>
                      Deliberately next
                    </h3>
                    <span className="font-mono text-[10px] text-text-muted">
                      {String(SCOPE_NEXT.length).padStart(2, "0")}
                    </span>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {SCOPE_NEXT.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-[12px] leading-relaxed text-text-muted"
                      >
                        <span
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-muted/40"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 border-t border-border/70 pt-4 text-[11px] leading-relaxed text-text-muted/80">
                    No roadmap theatre. If it isn't in the repository, it isn't on this page.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-b border-border bg-surface/30">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
            <div>
              <SectionHeading
                eyebrow="FAQ"
                title="Fair questions."
                description="The short version: the AI is real, the demo is mocked on purpose, and the scope is written down."
              />
              <div className="mt-6 rounded-lg border border-border bg-surface p-3">
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Something missing? The source, the setup guide and the issue tracker's own
                  backlog are all public.
                </p>
                <a
                  href="https://github.com/meetsojitra08/bugsence"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-accent underline-offset-4 hover:underline"
                >
                  github.com/meetsojitra08/bugsence
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div data-testid="faq-accordion">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                const panelId = `faq-panel-${index}`;
                return (
                  <div key={faq.q} className="border-b border-border first:border-t">
                    <h3>
                      <button
                        type="button"
                        id={`faq-trigger-${index}`}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        data-testid={`faq-toggle-${index}`}
                        className="group flex w-full items-start justify-between gap-6 py-4 text-left"
                      >
                        <span
                          className={cn(
                            "text-[13.5px] font-medium leading-snug transition-colors",
                            isOpen ? "text-text" : "text-text hover:text-accent"
                          )}
                        >
                          {faq.q}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                            isOpen
                              ? "border-accent/30 bg-accent/10 text-accent"
                              : "border-border text-text-muted group-hover:border-text-muted/40"
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-300",
                              isOpen && "rotate-180"
                            )}
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                    </h3>

                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={`faq-trigger-${index}`}
                      aria-hidden={!isOpen}
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-300 ease-subtle motion-reduce:transition-none",
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="max-w-xl pb-5 pr-8 text-[12.5px] leading-relaxed text-text-muted">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="relative isolate overflow-hidden rounded-2xl border border-[#242424] bg-[#0A0A0A] px-6 py-14 text-center sm:px-12 lg:py-16">
              <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
                <div className="absolute -right-24 -top-32 h-[380px] w-[380px] rounded-full bg-[#FF0000]/[0.12] blur-3xl" />
                <div className="absolute inset-0 bg-grid-fade opacity-[0.16] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
              </div>

              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF0000]" aria-hidden="true" />
                No signup required
              </p>

              <h2 className="mx-auto mt-5 max-w-2xl text-balance text-[clamp(2rem,4.6vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[#F5F5F5]">
                See it with the demo data first.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[13.5px] leading-relaxed text-[#A3A3A3]">
                The same seeded workspace opens in one click: 4 teammates, 2 projects, 40+ issues,
                an AI triage pass and a board you can drag.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <Button
                  size="lg"
                  onClick={handleDemoClick}
                  className="group h-11 w-full gap-2 bg-[#F5F5F5] px-5 text-[#0A0A0A] hover:bg-white sm:w-auto"
                  data-testid="closing-cta-demo"
                >
                  Launch the live demo
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/register")}
                  className="h-11 w-full border-white/20 bg-transparent px-5 text-[#F5F5F5] hover:border-white/30 hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Create free account
                </Button>
              </div>

              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                MIT licensed · self-hostable · demo runs entirely in your browser
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xs">
              <Link to="/" className="flex items-center gap-2" aria-label="BugSense home">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Bug className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[14.5px] font-semibold tracking-tight">BugSense</span>
              </Link>
              <p className="mt-3 text-[11.5px] leading-relaxed text-text-muted">
                AI-native issue tracking for teams that would rather ship than triage. Built with
                Django, React, PostgreSQL and pgvector.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-14">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted/70">
                  Product
                </p>
                <ul className="mt-3 space-y-2 text-[11.5px]">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.href}
                        className="text-text-muted transition-colors hover:text-text"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted/70">
                  Build
                </p>
                <ul className="mt-3 space-y-2 text-[11.5px]">
                  <li>
                    <a
                      href="https://github.com/meetsojitra08/bugsence"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-text-muted transition-colors hover:text-text"
                    >
                      GitHub
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/meetsojitra08/bugsence/blob/main/README.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-text-muted transition-colors hover:text-text"
                    >
                      README
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/meetsojitra08/bugsence/blob/main/LICENSE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-text-muted transition-colors hover:text-text"
                    >
                      MIT License
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted/70">
                  Access
                </p>
                <ul className="mt-3 space-y-2 text-[11.5px]">
                  <li>
                    <button
                      type="button"
                      onClick={handleDemoClick}
                      className="text-left text-text-muted transition-colors hover:text-text"
                    >
                      Live demo
                    </button>
                  </li>
                  <li>
                    <Link to="/login" className="text-text-muted transition-colors hover:text-text">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/register"
                      className="text-text-muted transition-colors hover:text-text"
                    >
                      Create account
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-border/70 pt-5 text-[10.5px] text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} BugSense · MIT License</p>
            <p className="font-mono uppercase tracking-[0.12em] text-text-muted/70">
              v2.0 · built in the open
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
