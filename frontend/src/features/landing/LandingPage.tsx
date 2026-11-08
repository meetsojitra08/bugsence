import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bug,
  Sparkles,
  ArrowRight,
  Zap,
  ShieldCheck,
  LayoutGrid,
  BarChart3,
  Search,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  Sun,
  Moon,
  Github,
  Laptop,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

const PRESET_BUGS = [
  {
    label: "Token Refresh Race",
    input:
      "When 5 concurrent API requests trigger 401 simultaneously, the single-use refresh token is blacklisted by the first call, logging the user out.",
    result: {
      title: "Fix authentication token refresh race condition on concurrent calls",
      priority: "urgent",
      severity: "critical",
      labels: ["security", "frontend"],
      confidence: "98%",
    },
  },
  {
    label: "Memory Leak in WS",
    input:
      "Notification WebSocket listener does not unbind event callbacks on component unmount, leaking 50MB of memory over 2 hours of active usage.",
    result: {
      title: "Clean up WebSocket event listeners on notification bell unmount",
      priority: "high",
      severity: "major",
      labels: ["performance", "frontend"],
      confidence: "95%",
    },
  },
  {
    label: "Kanban Collision",
    input:
      "Dragging cards between two items 50 times subdivides float positions below 1e-6 epsilon, causing positioning duplicate keys.",
    result: {
      title: "Implement automatic float positioning rebalancing on Kanban move",
      priority: "high",
      severity: "major",
      labels: ["backend", "frontend"],
      confidence: "96%",
    },
  },
];

const FAQS = [
  {
    q: "How does the AI triage feature work?",
    a: "BugSense passes your raw bug description to Google Gemini 2.5 Flash with strict Pydantic JSON schema constraints. In under 2 seconds, it extracts an actionable engineering title, assigns appropriate priority and severity levels, suggests labels, and detects potential duplicate issues using pgvector cosine similarity.",
  },
  {
    q: "Can I try BugSense without creating an account?",
    a: "Yes! Click the 'Try Live Demo' button anywhere on this page to launch a full recruiter demo session instantly with realistic issues, drag-and-drop Kanban boards, team analytics, and mock AI responses.",
  },
  {
    q: "What database does BugSense use?",
    a: "BugSense is backed by PostgreSQL 16 with the official pgvector extension. Dense 768-dimensional issue embeddings are stored directly in PostgreSQL with an HNSW index for sub-50ms vector cosine similarity queries.",
  },
  {
    q: "Is BugSense fully responsive and accessible?",
    a: "Yes. BugSense features full responsive mobile support, light and dark themes with WCAG AA compliance, accessible ARIA roles, and keyboard navigation across all views.",
  },
];

export function LandingPage() {
  const { isAuthenticated, loginAsDemo } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Interactive AI Simulator state
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customInput, setCustomInput] = useState(PRESET_BUGS[0].input);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedResult, setSimulatedResult] = useState(PRESET_BUGS[0].result);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSimulatedResult(PRESET_BUGS[selectedPreset].result);
      setIsSimulating(false);
    }, 600);
  };

  const handleSelectPreset = (idx: number) => {
    setSelectedPreset(idx);
    setCustomInput(PRESET_BUGS[idx].input);
    setSimulatedResult(PRESET_BUGS[idx].result);
  };

  const handleDemoClick = async () => {
    await loginAsDemo();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary/20 selection:text-primary">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Bug className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-text">BugSense</span>
            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-400">
              AI-Native
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-xs font-medium text-text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-text">
              Features
            </a>
            <a href="#ai-spotlight" className="transition-colors hover:text-text">
              AI Triage
            </a>
            <a href="#shortcuts" className="transition-colors hover:text-text">
              Shortcuts
            </a>
            <a href="#faq" className="transition-colors hover:text-text">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 text-text-muted hover:text-text"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/dashboard")} className="text-xs">
                <span>Go to App</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text"
                >
                  Sign In
                </Link>
                <Button
                  size="sm"
                  onClick={handleDemoClick}
                  className="hidden text-xs sm:inline-flex"
                  data-testid="hero-try-demo-btn"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-purple-200" />
                  <span>Try Live Demo</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-8 lg:pt-24 lg:pb-32">
        {/* Glow ambient background circles */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 left-1/4 -z-10 h-[300px] w-[400px] rounded-full bg-purple-500/10 blur-[100px]" />

        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>BugSense 2.0 with Gemini 2.5 Flash &amp; pgvector</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-text sm:text-5xl lg:text-6xl">
            AI-Native Issue Tracking Built for{" "}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
              Fast Engineering Teams
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-text-muted sm:text-lg">
            File bugs in seconds with AI structured triage, stop redundant issues with pgvector
            semantic duplicate detection, and ship faster with a 60 FPS drag-and-drop Kanban board.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={handleDemoClick}
              className="w-full text-sm font-semibold shadow-lg shadow-primary/20 sm:w-auto"
              data-testid="hero-cta-demo"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Explore Live Recruiter Demo</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/register")}
              className="w-full text-sm sm:w-auto"
            >
              <span>Create Free Account</span>
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> 1-Click interactive demo
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Open source code
            </span>
          </div>

          {/* Product Preview Card */}
          <div className="mt-12 rounded-2xl border border-border bg-surface p-2 shadow-2xl transition-all duration-300 hover:shadow-primary/5 sm:p-4">
            <div className="flex items-center justify-between border-b border-border pb-3 px-2">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-danger/60" />
                <span className="h-3 w-3 rounded-full bg-warning/60" />
                <span className="h-3 w-3 rounded-full bg-success/60" />
              </div>
              <div className="flex items-center gap-2 rounded-md bg-surface-elevated px-3 py-1 text-[11px] font-mono text-text-muted">
                <Laptop className="h-3 w-3" />
                <span>app.bugsense.dev/dashboard</span>
              </div>
              <span className="text-[11px] font-semibold text-primary">Live Workspace Preview</span>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 text-left sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-elevated p-3">
                <div className="text-[11px] text-text-muted">Active Sprints</div>
                <div className="mt-1 text-xl font-bold text-text">24 Issues</div>
                <div className="mt-1 text-[10px] text-success font-medium">↑ 18 resolved this week</div>
              </div>
              <div className="rounded-xl border border-border bg-surface-elevated p-3">
                <div className="text-[11px] text-text-muted">Avg Resolution</div>
                <div className="mt-1 text-xl font-bold text-text">3.4 Days</div>
                <div className="mt-1 text-[10px] text-text-muted">Under 5-day SLA</div>
              </div>
              <div className="rounded-xl border border-border bg-surface-elevated p-3">
                <div className="text-[11px] text-text-muted">AI Triage Match</div>
                <div className="mt-1 text-xl font-bold text-purple-400">97.4%</div>
                <div className="mt-1 text-[10px] text-purple-300">Auto-classified</div>
              </div>
              <div className="rounded-xl border border-border bg-surface-elevated p-3">
                <div className="text-[11px] text-text-muted">Command Latency</div>
                <div className="mt-1 text-xl font-bold text-text">&lt; 35ms</div>
                <div className="mt-1 text-[10px] text-primary">Global ⌘K palette</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Tech Stack Strip */}
      <section className="border-y border-border bg-surface/50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Engineered with modern, production-grade cloud primitives
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-text-muted sm:gap-12">
            <span className="flex items-center gap-2 text-text font-semibold">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> React 18 &amp; TypeScript
            </span>
            <span className="flex items-center gap-2 text-text font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Django 5 REST Framework
            </span>
            <span className="flex items-center gap-2 text-text font-semibold">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> Google Gemini 2.5 Flash
            </span>
            <span className="flex items-center gap-2 text-text font-semibold">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> PostgreSQL &amp; pgvector
            </span>
            <span className="flex items-center gap-2 text-text font-semibold">
              <span className="h-2 w-2 rounded-full bg-cyan-500" /> Tailwind CSS Design Tokens
            </span>
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section id="features" className="px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Core Capabilities
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Everything Your Engineering Team Needs
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Built from scratch to eliminate friction from filing, triaging, and tracking issues.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-xs transition-all hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">AI Triage &amp; Auto-Fill</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Paste any unstructured bug dump or stack trace. Gemini structured output automatically
                extracts concise titles, priorities, and labels in seconds.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-xs transition-all hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">pgvector Duplicate Detection</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Prevents duplicate filing by comparing 768-dim embeddings in PostgreSQL. Surfaces
                matches with similarity scores before submission.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-xs transition-all hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">60 FPS Drag-and-Drop Board</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Built with dnd-kit and float midpoint ordering. Optimistic state transitions ensure zero
                lag, backed by automatic column rebalancing.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-xs transition-all hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">Executive Velocity Analytics</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Real-time overview metrics, 7/30/90-day created vs resolved trends, and individual team
                workload distributions with zero query bottlenecks.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-xs transition-all hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">Unified Activity Timeline</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Chronological timeline intertwining status movements and team discussions with
                markdown formatting and real-time @mention notification triggers.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-xs transition-all hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">Lightning Command Palette</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Press Cmd+K from any screen. Instantly search issues, projects, and people, or trigger
                quick actions with sub-50ms keyboard responses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Live Interactive AI Triage Simulator */}
      <section id="ai-spotlight" className="border-t border-border bg-surface/30 px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
              Interactive Simulator
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Experience Gemini AI Triage Live
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Select a sample bug below or test the model to see how BugSense parses raw text into
              structured engineering fields.
            </p>
          </div>

          {/* Simulator Box */}
          <div className="mt-10 rounded-2xl border border-border bg-surface p-6 shadow-xl" data-testid="ai-simulator">
            {/* Preset Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-text-muted">Presets:</span>
              {PRESET_BUGS.map((preset, idx) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(idx)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedPreset === idx
                      ? "bg-purple-600 text-white shadow-xs"
                      : "border border-border bg-surface-elevated text-text-muted hover:text-text"
                  }`}
                  data-testid={`preset-btn-${idx}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div className="mt-4">
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface-elevated p-3 text-xs text-text focus:border-purple-500 focus:outline-hidden"
                placeholder="Paste bug report or stack trace..."
                data-testid="ai-simulator-textarea"
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                Powered by Gemini 2.5 Flash Structured JSON Output
              </span>
              <Button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                size="sm"
                className="bg-purple-600 text-white hover:bg-purple-700"
                data-testid="run-ai-simulation-btn"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                <span>{isSimulating ? "Triaging..." : "Run AI Triage"}</span>
              </Button>
            </div>

            {/* Simulated Structured Result */}
            <div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center justify-between border-b border-purple-500/10 pb-2">
                <span className="text-xs font-semibold text-purple-400">Structured Output</span>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300">
                  {simulatedResult.confidence} confidence
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                <div>
                  <span className="text-[11px] font-medium text-text-muted">Generated Title:</span>
                  <div className="mt-0.5 text-xs font-bold text-text" data-testid="simulated-title">
                    {simulatedResult.title}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-muted">Priority:</span>
                    <span className="rounded bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger uppercase">
                      {simulatedResult.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-muted">Severity:</span>
                    <span className="rounded bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning uppercase">
                      {simulatedResult.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-muted">Labels:</span>
                    {simulatedResult.labels.map((lbl) => (
                      <span
                        key={lbl}
                        className="rounded bg-surface-elevated px-2 py-0.5 font-mono text-[10px] text-text"
                      >
                        #{lbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Keyboard Shortcuts Showcase */}
      <section id="shortcuts" className="px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Developer Velocity
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Never Leave Your Keyboard
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            BugSense is designed with first-class keyboard shortcuts for maximum speed.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <kbd className="inline-block rounded-md border border-border bg-surface-elevated px-2.5 py-1 font-mono text-sm font-bold text-text shadow-xs">
                C
              </kbd>
              <div className="mt-2 text-xs font-semibold text-text">New Issue</div>
              <div className="text-[11px] text-text-muted">Quick create modal</div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <kbd className="inline-block rounded-md border border-border bg-surface-elevated px-2.5 py-1 font-mono text-sm font-bold text-text shadow-xs">
                ⌘K / Ctrl+K
              </kbd>
              <div className="mt-2 text-xs font-semibold text-text">Command Menu</div>
              <div className="text-[11px] text-text-muted">Global fast search</div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <kbd className="inline-block rounded-md border border-border bg-surface-elevated px-2.5 py-1 font-mono text-sm font-bold text-text shadow-xs">
                ⌘J / Ctrl+J
              </kbd>
              <div className="mt-2 text-xs font-semibold text-text">AI Triage</div>
              <div className="text-[11px] text-text-muted">Auto-fill assistant</div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 text-center">
              <kbd className="inline-block rounded-md border border-border bg-surface-elevated px-2.5 py-1 font-mono text-sm font-bold text-text shadow-xs">
                ?
              </kbd>
              <div className="mt-2 text-xs font-semibold text-text">Shortcuts Help</div>
              <div className="text-[11px] text-text-muted">Overlay cheat sheet</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ Accordion */}
      <section id="faq" className="border-t border-border bg-surface/30 px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              FAQ
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-10 space-y-3" data-testid="faq-accordion">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-border bg-surface transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-text"
                    data-testid={`faq-toggle-${idx}`}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-text-muted transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/50 px-4 pb-4 pt-2 text-xs leading-relaxed text-text-muted">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section className="px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/15 via-surface to-primary/10 p-8 text-center sm:p-12">
          <Zap className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Ready to upgrade your issue workflow?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-xs text-text-muted sm:text-sm">
            Launch the recruiter demo in one click or set up your team workspace in under two minutes.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={handleDemoClick} className="w-full sm:w-auto">
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Launch Live Demo</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/register")}
              className="w-full sm:w-auto"
            >
              <span>Get Started</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-text-muted">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" />
            <span className="font-bold text-text">BugSense</span>
            <span>&copy; {new Date().getFullYear()} — MIT License</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/meetsojitra08/bugsence"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-text transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub Repository</span>
            </a>
            <span>•</span>
            <span className="font-mono text-[11px]">v1.0.0 Production Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
