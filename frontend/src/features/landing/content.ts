import {
  BarChart3,
  Clock3,
  Command,
  CopyX,
  LayoutGrid,
  Sparkles,
  SunMoon,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------------------------------
 * Hero: an illustrative triage run over real seeded-style reports.
 * The preview is deliberately labelled as an example; the live app calls Gemini.
 * ----------------------------------------------------------------------------------------------- */

export type PresetPriority = "low" | "medium" | "high" | "urgent";
export type PresetSeverity = "trivial" | "minor" | "major" | "critical";

export interface TriagePreset {
  id: string;
  label: string;
  report: string;
  result: {
    title: string;
    type: "bug" | "feature" | "task" | "improvement";
    priority: PresetPriority;
    severity: PresetSeverity;
    labels: string[];
    confidence: number;
    steps: number;
    rootCause: string;
    duplicate: {
      key: string;
      title: string;
      similarity: number;
      status: string;
    };
  };
}

export const TRIAGE_PRESETS: TriagePreset[] = [
  {
    id: "auth",
    label: "Auth race",
    report:
      "When 5 concurrent API requests hit a 401 at the same time, the single-use refresh token is blacklisted by the first call. Every other tab gets logged out.",
    result: {
      title: "Fix authentication token refresh race condition on concurrent calls",
      type: "bug",
      priority: "urgent",
      severity: "critical",
      labels: ["security", "frontend"],
      confidence: 96,
      steps: 3,
      rootCause:
        "Refresh rotation is not mutex-guarded per session, so parallel 401 handlers race to reuse a token that is already blacklisted.",
      duplicate: {
        key: "BUG-14",
        title: "Silent token rotation failure on cross-tab session expiry",
        similarity: 88,
        status: "in progress",
      },
    },
  },
  {
    id: "leak",
    label: "WS leak",
    report:
      "The notification WebSocket listener never unbinds on unmount. RSS climbs about 50 MB over two hours of active use, then the tab freezes.",
    result: {
      title: "Clean up WebSocket event listeners on notification bell unmount",
      type: "bug",
      priority: "high",
      severity: "major",
      labels: ["performance", "frontend"],
      confidence: 92,
      steps: 3,
      rootCause:
        "The subscribe effect returns a cleanup that unsubscribes from the store but never removes the socket listener itself.",
      duplicate: {
        key: "BUG-21",
        title: "Notification badge keeps polling after logout",
        similarity: 81,
        status: "todo",
      },
    },
  },
  {
    id: "board",
    label: "Board drift",
    report:
      "Dragging the same card between two neighbours about 50 times subdivides float positions below 1e-6. Column order becomes unstable and sometimes duplicates.",
    result: {
      title: "Implement automatic float positioning rebalancing on Kanban move",
      type: "bug",
      priority: "high",
      severity: "major",
      labels: ["backend", "frontend"],
      confidence: 94,
      steps: 3,
      rootCause:
        "Midpoint insertion has no minimum-gap guard, so positions eventually collide at float precision.",
      duplicate: {
        key: "BUG-3",
        title: "Kanban drag-and-drop ordering collision on consecutive moves",
        similarity: 86,
        status: "in review",
      },
    },
  },
];

/* -------------------------------------------------------------------------------------------------
 * Navigation + the product tour (mirrors the real app routes and screens).
 * ----------------------------------------------------------------------------------------------- */

export interface NavItem {
  label: string;
  href: string;
  id: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Tour", href: "#tour", id: "tour" },
  { label: "Features", href: "#features", id: "features" },
  { label: "Workflow", href: "#workflow", id: "workflow" },
  { label: "Under the hood", href: "#stack", id: "stack" },
  { label: "FAQ", href: "#faq", id: "faq" },
];

export type TourId = "dashboard" | "issues" | "board" | "issue";

export interface TourTab {
  id: TourId;
  label: string;
  route: string;
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
}

export const TOUR_TABS: TourTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    kicker: "Workspace health",
    title: "The calm view of a noisy week",
    description:
      "Five KPIs, a created-vs-resolved burnup over 7, 30 or 90 days, status and severity splits, and workload per engineer — aggregated on the server and cached for 60 seconds.",
    bullets: ["Open, critical, resolved, overdue", "7 / 30 / 90 day burnup", "Workload by assignee"],
  },
  {
    id: "issues",
    label: "Issues",
    route: "/issues",
    kicker: "The full list",
    title: "Every filter, answered server-side",
    description:
      "A dense, paginated table over status, priority, severity, type, assignee, label and free text. Filter state lives in the URL so a view is always shareable.",
    bullets: ["Server-side filtering", "Stable pagination", "Labels, due dates, assignees"],
  },
  {
    id: "board",
    label: "Board",
    route: "/board",
    kicker: "The kanban",
    title: "Drag without the stutter",
    description:
      "Six status columns, optimistic moves with rollback, midpoint float ordering, and automatic rebalancing when two cards get too close for float precision.",
    bullets: ["6 status columns", "Optimistic move + rollback", "Auto-rebalanced ordering"],
  },
  {
    id: "issue",
    label: "Issue detail",
    route: "/issues/1",
    kicker: "The record",
    title: "The whole story in one place",
    description:
      "Inline-editable properties, markdown description, an AI summary with open questions and next steps, markdown comments with mentions, and every field change in one activity trail.",
    bullets: ["AI summary, always editable", "Comments with @mentions", "Complete activity trail"],
  },
];

/* -------------------------------------------------------------------------------------------------
 * Feature bento. Each card maps to something that actually ships.
 * ----------------------------------------------------------------------------------------------- */

export interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
  span: "wide" | "normal";
  visual: "triage" | "duplicates" | "board" | "analytics" | "timeline" | "keys" | "theme";
}

export const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "A triage pass that fills the form",
    body: "Paste a stack trace or a half-written report. Get a title, type, priority, severity, repro steps, expected vs actual, labels, a probable cause and a confidence score. Every field stays editable.",
    meta: "structured JSON · validated with Pydantic",
    span: "wide",
    visual: "triage",
  },
  {
    icon: CopyX,
    title: "Duplicates, caught before filing",
    body: "The report becomes a 768-dimension embedding, compared against the project with pgvector cosine distance. Near-matches surface with a percentage instead of a cleanup sprint.",
    meta: "0.80 threshold · trigram fallback",
    span: "normal",
    visual: "duplicates",
  },
  {
    icon: LayoutGrid,
    title: "A board that keeps up",
    body: "Six columns, optimistic drag moves, midpoint float ordering and automatic rebalancing when the gap collapses. The pointer never waits for the network.",
    meta: "dnd-kit · 6 columns",
    span: "normal",
    visual: "board",
  },
  {
    icon: BarChart3,
    title: "Analytics without the query tax",
    body: "Open, critical, resolved and overdue counts, burnup by day, severity splits and workload — one aggregate per view, cached server-side for 60 seconds.",
    meta: "60s cache · overview + trends",
    span: "normal",
    visual: "analytics",
  },
  {
    icon: Clock3,
    title: "One timeline for every change",
    body: "Status, priority and assignee changes sit next to markdown comments and @mentions, newest first. The bell carries the same events as notifications.",
    meta: "activity + comments · 30s polling",
    span: "normal",
    visual: "timeline",
  },
  {
    icon: Command,
    title: "Keyboard-first, not keyboard-only",
    body: "⌘K searches issues, projects and people. ⌘J re-runs triage. G then B jumps to the board. Press ? for the full cheat sheet — every control still has a pointer path.",
    meta: "⌘K · ⌘J · G→B · ?",
    span: "wide",
    visual: "keys",
  },
  {
    icon: SunMoon,
    title: "Both themes, actually finished",
    body: "A warm paper light mode and a true-black dark mode built on the same tokens, with red reserved for signal — plus reduced-motion and focus-visible handling.",
    meta: "WCAG AA target · reduced motion",
    span: "normal",
    visual: "theme",
  },
];

/* -------------------------------------------------------------------------------------------------
 * Workflow strip.
 * ----------------------------------------------------------------------------------------------- */

export interface WorkflowStep {
  number: string;
  title: string;
  body: string;
  detail: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    number: "01",
    title: "Paste anything",
    body: "A stack trace, a log line, a QA note, an angry customer email. Raw text stays raw until you decide to keep it.",
    detail: "truncated to 4,000 chars before the model",
  },
  {
    number: "02",
    title: "Get structured fields",
    body: "Gemini returns a strict schema: title, type, priority, severity, steps, expected vs actual, labels, root cause, confidence.",
    detail: "Pydantic-validated · one retry on bad JSON",
  },
  {
    number: "03",
    title: "Check for duplicates",
    body: "The same text becomes an embedding, compared inside the project. Anything above 0.80 shows up as a banner with its score.",
    detail: "768-d · pgvector cosine distance",
  },
  {
    number: "04",
    title: "Move it to done",
    body: "Drag it across the board, discuss it with mentions, and let the activity trail and burnup charts tell the story.",
    detail: "optimistic UI · no spinner tax",
  },
];

/* -------------------------------------------------------------------------------------------------
 * Shortcut cheat sheet, scoped to where it actually works.
 * ----------------------------------------------------------------------------------------------- */

export interface Shortcut {
  keys: string[];
  label: string;
  scope: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], label: "Search issues, projects, people", scope: "global" },
  { keys: ["⌘", "J"], label: "Run AI triage in the create form", scope: "create issue" },
  { keys: ["C"], label: "Open quick create", scope: "issues & board" },
  { keys: ["G", "B"], label: "Jump to the Kanban board", scope: "global" },
  { keys: ["?"], label: "Open the shortcut cheat sheet", scope: "global" },
  { keys: ["Esc"], label: "Close a panel, modal or drawer", scope: "global" },
];

/* -------------------------------------------------------------------------------------------------
 * Honest scope: shipped vs deliberately not yet.
 * ----------------------------------------------------------------------------------------------- */

export const SCOPE_SHIPPED: string[] = [
  "Email + password auth with rotating, blacklisted refresh tokens",
  "Projects with owner / admin / member / viewer roles",
  "Issues with 6 statuses, 4 priorities, 4 severities, 4 types, labels, assignees and due dates",
  "Drag-and-drop Kanban with reordering and quick add",
  "Filterable, paginated issue list with stable ordering",
  "Markdown comments with @mentions and a combined activity timeline",
  "AI triage, semantic duplicate detection and editable issue summaries",
  "Project analytics with a 60-second server cache",
  "Notification bell with unread badge",
  "⌘K search, keyboard shortcuts, light/dark themes",
  "One-click seeded demo that runs without a backend",
];

export const SCOPE_NEXT: string[] = [
  "File attachments and S3 uploads",
  "GitHub issue sync and Slack alerts",
  "Real-time collaboration over WebSockets",
  "Billing, SSO and a mobile app",
  "Approximate vector index (HNSW / IVFFlat) for very large projects",
  "Password reset flow",
];

/* -------------------------------------------------------------------------------------------------
 * FAQ — every answer describes the current build.
 * ----------------------------------------------------------------------------------------------- */

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: "Is the AI real, or a demo?",
    a: "Both, and they are clearly separated. A signed-in workspace calls Gemini through the Django backend for triage, duplicate detection and issue summaries. The one-click demo runs on deterministic mock responses so the whole product works without an API key — which is why the hero preview on this page is labelled as an example.",
  },
  {
    q: "Do I need a Gemini API key to try it?",
    a: "Not for the demo. Self-hosting a real AI workspace requires GEMINI_API_KEY in the backend environment, plus optional GEMINI_MODEL and GEMINI_EMBED_MODEL overrides. Without a key the AI endpoints return a clear 503 instead of pretending to work.",
  },
  {
    q: "How does duplicate detection actually work?",
    a: "A report is embedded into 768 dimensions and compared with the project's issues using pgvector cosine distance at a default 0.80 threshold. If embeddings are unavailable, a trigram-similarity fallback keeps search useful. It is exact search rather than an approximate ANN index — comfortable at project scale, and a known next step for very large workspaces.",
  },
  {
    q: "What is inside the one-click demo?",
    a: "A seeded workspace with four teammates, two projects, 40+ issues, labels, comments, analytics and mock AI responses. No signup, no server writes; it exists so you can click through every screen in a few minutes.",
  },
  {
    q: "Can I self-host BugSense?",
    a: "Yes — it is MIT licensed. Docker Compose brings up PostgreSQL 16 with pgvector, Django 5 and Vite run locally, and `python manage.py seed_demo` fills the demo workspace with issues and comments.",
  },
  {
    q: "Is it accessible and responsive?",
    a: "Keyboard paths cover the command palette, tabs and accordions; focus rings are visible; contrast targets WCAG AA; reduced-motion preferences are respected; and the layout collapses cleanly on mobile. Light and dark are both checked, since red-on-black is the easiest place to get contrast wrong.",
  },
];

/* -------------------------------------------------------------------------------------------------
 * Engineering facts + stack.
 * ----------------------------------------------------------------------------------------------- */

export const STACK_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Client",
    items: [
      "React 18",
      "Vite 6",
      "TypeScript 5",
      "Tailwind CSS",
      "TanStack Query",
      "Zustand",
      "dnd-kit",
      "Recharts",
    ],
  },
  {
    label: "Server",
    items: [
      "Django 5",
      "DRF",
      "SimpleJWT",
      "PostgreSQL 16",
      "pgvector",
      "Gemini",
      "Gunicorn",
      "WhiteNoise",
    ],
  },
  {
    label: "Quality",
    items: ["pytest", "Vitest", "Ruff", "ESLint", "Prettier", "GitHub Actions"],
  },
];

export const ENGINEERING_FACTS: string[] = [
  "Prompt-injection boundaries around untrusted reports",
  "Strict JSON schema, validated with Pydantic",
  "One automatic retry on malformed model output",
  "Rotating refresh tokens with a blacklist",
  "AI endpoints throttled per user",
  "60-second analytics cache, versioned by project",
];

export const CODE_SNIPPET = `# apps/ai/services/duplicates.py (cosine path)
matched = (
    Issue.objects
    .filter(project=project, embedding__isnull=False)
    .annotate(distance=CosineDistance("embedding", query_embedding))
    .filter(distance__lte=1.0 - 0.80)
    .order_by("distance")[:5]
)

# apps/ai/schemas.py (validated model output)
class AITriageResponse(BaseModel):
    title: str
    type: IssueType
    priority: IssuePriority
    severity: IssueSeverity
    steps_to_reproduce: list[str]
    expected_behavior: str
    actual_behavior: str
    suggested_labels: list[str]
    possible_root_cause: str
    confidence: float
    reasoning: str`;

export const HERO_PROOF = [
  "Seeded demo workspace",
  "4 teammates · 2 projects · 40+ issues",
  "No card required",
];
