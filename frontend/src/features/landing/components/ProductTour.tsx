import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, Bell, Bug, Check, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOUR_TABS, type TourId } from "../content";

/* -------------------------------------------------------------------------------------------------
 * Small presentational primitives used by every preview screen.
 * ----------------------------------------------------------------------------------------------- */

const STATUS_META: Record<string, { label: string; className: string; dot: string }> = {
  backlog: {
    label: "Backlog",
    className: "border-text-muted/25 bg-text-muted/10 text-text-muted",
    dot: "bg-status-backlog",
  },
  todo: {
    label: "Todo",
    className: "border-text-muted/30 bg-surface-elevated text-text",
    dot: "bg-status-todo",
  },
  in_progress: {
    label: "In progress",
    className: "border-accent/30 bg-accent/10 text-accent",
    dot: "bg-status-in_progress",
  },
  in_review: {
    label: "In review",
    className: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-status-in_review",
  },
  done: {
    label: "Done",
    className: "border-success/30 bg-success/10 text-success",
    dot: "bg-status-done",
  },
  closed: {
    label: "Closed",
    className: "border-border bg-surface text-text-muted",
    dot: "bg-status-closed",
  },
};

const PRIORITY_CLASS: Record<string, string> = {
  urgent: "text-priority-urgent",
  high: "text-priority-high",
  medium: "text-priority-medium",
  low: "text-priority-low",
};

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

function Avatar({ name, className }: { name: string; className?: string }) {
  const tone = AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length];
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[6.5px] font-semibold",
        tone,
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.todo;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[7.5px] font-medium",
        meta.className
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-2.5", className)}>{children}</div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Data shown inside the previews mirrors the seeded demo workspace.
 * ----------------------------------------------------------------------------------------------- */

interface Kpi {
  label: string;
  value: string;
  tone?: string;
}

const KPIS: Kpi[] = [
  { label: "Open", value: "14" },
  { label: "Critical", value: "2", tone: "text-danger" },
  { label: "Resolved", value: "10" },
  { label: "Overdue", value: "2", tone: "text-danger" },
  { label: "Avg resolution", value: "3.4d" },
];

const CREATED = [1, 0, 2, 1, 3, 2, 1, 4, 2, 3, 1, 2, 1, 1];
const RESOLVED = [0, 1, 0, 1, 1, 0, 2, 1, 1, 1, 0, 1, 1, 0];

const STATUS_COUNTS = [
  { key: "backlog", count: 4 },
  { key: "todo", count: 5 },
  { key: "in_progress", count: 3 },
  { key: "in_review", count: 2 },
  { key: "done", count: 8 },
  { key: "closed", count: 2 },
];

const WORKLOAD = [
  { name: "Demo Recruiter", segments: [2, 1, 2, 0] },
  { name: "Sarah Chen", segments: [1, 1, 1, 1] },
  { name: "Marcus Vance", segments: [0, 1, 2, 0] },
  { name: "Unassigned", segments: [0, 0, 2, 0] },
];

const ISSUE_ROWS = [
  {
    key: "BUG-1",
    title: "Fix token refresh race condition causing unexpected logouts on concurrent calls",
    status: "in_progress",
    priority: "urgent",
    severity: "critical",
    assignee: "Sarah Chen",
  },
  {
    key: "BUG-12",
    title: "CORS preflight caching header Max-Age missing on production API responses",
    status: "todo",
    priority: "medium",
    severity: "minor",
    assignee: "Unassigned",
  },
  {
    key: "BUG-3",
    title: "Kanban drag-and-drop float positioning collision on 50 consecutive moves",
    status: "in_review",
    priority: "high",
    severity: "major",
    assignee: "Marcus Vance",
  },
  {
    key: "BUG-8",
    title: "Add dark mode token contrast check for muted badge text in high-ambient lighting",
    status: "done",
    priority: "low",
    severity: "trivial",
    assignee: "Elena Rostova",
  },
  {
    key: "BUG-19",
    title: "Add Cmd+K Command Palette with live debounced search across issues and members",
    status: "done",
    priority: "high",
    severity: "minor",
    assignee: "Demo Recruiter",
  },
];

interface BoardCard {
  key: string;
  title: string;
  labels: string[];
  assignee: string;
  due: string | null;
  dragging?: boolean;
}

interface BoardColumn {
  id: string;
  count: number;
  cards: BoardCard[];
}

const BOARD_COLUMNS: BoardColumn[] = [
  {
    id: "backlog",
    count: 4,
    cards: [
      {
        key: "BUG-12",
        title: "CORS preflight caching header Max-Age missing",
        labels: ["backend"],
        assignee: "Unassigned",
        due: null,
      },
      {
        key: "BUG-18",
        title: "Notification bell badge needs 30s polling",
        labels: ["frontend"],
        assignee: "Elena Rostova",
        due: "Sep 4",
      },
    ],
  },
  {
    id: "todo",
    count: 5,
    cards: [
      {
        key: "BUG-2",
        title: "DB connection pool exhaustion during AI batch",
        labels: ["backend", "perf"],
        assignee: "Marcus Vance",
        due: "Tomorrow",
      },
      {
        key: "BUG-9",
        title: "Mobile viewport overflow on detail drawer",
        labels: ["frontend", "ux"],
        assignee: "Sarah Chen",
        due: null,
      },
    ],
  },
  {
    id: "in_progress",
    count: 3,
    cards: [
      {
        key: "BUG-1",
        title: "Token refresh race on concurrent 401s",
        labels: ["security"],
        assignee: "Sarah Chen",
        due: "Overdue",
        dragging: true,
      },
      {
        key: "BUG-10",
        title: "Optimistic rollback for Kanban moves",
        labels: ["frontend"],
        assignee: "Demo Recruiter",
        due: null,
      },
    ],
  },
  {
    id: "in_review",
    count: 2,
    cards: [
      {
        key: "BUG-3",
        title: "Float positioning rebalancing on move",
        labels: ["backend", "frontend"],
        assignee: "Marcus Vance",
        due: "Sep 2",
      },
      {
        key: "BUG-5",
        title: "pgvector duplicate search ordering",
        labels: ["ai-engine"],
        assignee: "Elena Rostova",
        due: null,
      },
    ],
  },
];

const TIMELINE = [
  {
    name: "Sarah Chen",
    text: "moved status from Todo to In progress",
    time: "2h ago",
  },
  {
    name: "Marcus Vance",
    text: "commented: the lock needs to be scoped per session",
    time: "4h ago",
  },
  {
    name: "Demo Recruiter",
    text: "set priority to Urgent and assigned Sarah Chen",
    time: "Yesterday",
  },
];

/* -------------------------------------------------------------------------------------------------
 * App chrome + the four screens.
 * ----------------------------------------------------------------------------------------------- */

function AppFrame({
  active,
  route,
  children,
}: {
  active: string;
  route: string;
  children: ReactNode;
}) {
  const navItems = ["Dashboard", "Issues", "Board", "Team", "Settings"];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-card">
      <div className="flex h-7 items-center gap-1.5 border-b border-border bg-surface-elevated/60 px-3">
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <div className="mx-auto hidden max-w-[250px] truncate rounded border border-border bg-background px-2 py-0.5 font-mono text-[8.5px] text-text-muted sm:block">
          app.bugsense.dev{route}
        </div>
        <span className="ml-auto hidden font-mono text-[7.5px] uppercase tracking-[0.12em] text-text-muted/70 sm:block">
          demo session
        </span>
      </div>

      <div className="flex h-9 items-center gap-2 border-b border-border bg-background px-2.5">
        <span className="flex items-center gap-1.5">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded bg-accent text-accent-foreground">
            <Bug className="h-2.5 w-2.5" />
          </span>
          <span className="text-[10.5px] font-semibold tracking-tight">BugSense</span>
        </span>

        <div className="ml-2 hidden items-center sm:flex">
          {navItems.map((item) => (
            <span
              key={item}
              className={cn(
                "relative px-1.5 py-2.5 text-[9px] font-medium",
                active === item ? "text-text" : "text-text-muted"
              )}
            >
              {item}
              {active === item && (
                <span className="absolute inset-x-1 bottom-0 h-[1.5px] rounded-full bg-accent" />
              )}
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <span className="hidden rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[7.5px] text-text-muted md:inline">
            BUG · Core Web
          </span>
          <span className="flex h-5 items-center gap-1 rounded border border-border bg-surface px-1.5 text-[7.5px] text-text-muted">
            <Search className="h-2.5 w-2.5" />
            <span>⌘K</span>
          </span>
          <span className="relative flex h-5 w-5 items-center justify-center rounded border border-border bg-surface text-text-muted">
            <Bell className="h-2.5 w-2.5" />
            <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-accent" />
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[6.5px] font-semibold text-accent">
            DR
          </span>
        </div>
      </div>

      <div className="min-h-[400px] bg-background p-3 sm:p-4">{children}</div>
    </div>
  );
}

function buildLine(values: number[], width = 300, height = 62) {
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 6) - 3;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function DashboardScreen() {
  const createdPath = buildLine(CREATED);
  const resolvedPath = buildLine(RESOLVED);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[7.5px] uppercase tracking-[0.16em] text-text-muted">Workspace</p>
          <p className="mt-0.5 text-[13px] font-semibold tracking-tight">Welcome back, Demo</p>
        </div>
        <div className="flex items-center gap-1">
          {["7d", "30d", "90d"].map((range) => (
            <span
              key={range}
              className={cn(
                "rounded px-1.5 py-0.5 text-[8px] font-medium",
                range === "30d"
                  ? "bg-accent text-accent-foreground"
                  : "border border-border bg-surface text-text-muted"
              )}
            >
              {range}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 md:grid-cols-5">
        {KPIS.map((kpi) => (
          <Card key={kpi.label} className="px-2 py-1.5">
            <p className="text-[7.5px] uppercase tracking-[0.08em] text-text-muted">{kpi.label}</p>
            <p
              className={cn(
                "mt-0.5 text-[14px] font-semibold tabular-nums tracking-tight",
                kpi.tone
              )}
            >
              {kpi.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-5">
        <Card className="sm:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-[8.5px] font-medium">Created vs resolved</p>
            <span className="font-mono text-[7px] text-text-muted">30 days</span>
          </div>
          <svg
            viewBox="0 0 300 66"
            preserveAspectRatio="none"
            className="mt-1.5 h-[62px] w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="tour-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.22" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[16, 34, 52].map((y) => (
              <line
                key={y}
                x1="0"
                x2="300"
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                strokeDasharray="2 3"
              />
            ))}
            <path d={`${createdPath} L300 66 L0 66 Z`} fill="url(#tour-area)" />
            <path
              d={createdPath}
              fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d={resolvedPath}
              fill="none"
              stroke="hsl(var(--text-muted))"
              strokeWidth="1.2"
              strokeDasharray="3 2"
              opacity="0.8"
            />
            <circle cx="299" cy={Number(createdPath.split(" ").slice(-1)[0])} r="2" fill="hsl(var(--accent))" />
          </svg>
          <div className="mt-1 flex items-center gap-3 text-[7px] text-text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-accent" /> Created · 24
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-px w-2 bg-text-muted" /> Resolved · 10
            </span>
          </div>
        </Card>

        <Card className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[8.5px] font-medium">By status</p>
            <span className="font-mono text-[7px] text-text-muted">24</span>
          </div>
          <div className="mt-1.5 space-y-1">
            {STATUS_COUNTS.map((row) => (
              <div key={row.key} className="flex items-center gap-1.5">
                <span className="w-[42px] shrink-0 truncate text-[7.5px] text-text-muted">
                  {STATUS_META[row.key].label}
                </span>
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-border/60">
                  <span
                    className={cn("block h-full rounded-full", STATUS_META[row.key].dot)}
                    style={{ width: `${(row.count / 8) * 100}%` }}
                  />
                </span>
                <span className="w-3 text-right font-mono text-[7px] text-text-muted">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-2">
        <div className="flex items-center justify-between">
          <p className="text-[8.5px] font-medium">Workload · 14 open</p>
          <span className="font-mono text-[7px] text-text-muted">urgent · high · other</span>
        </div>
        <div className="mt-1.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {WORKLOAD.map((person) => {
            const total = person.segments.reduce((sum, value) => sum + value, 0);
            return (
              <div key={person.name} className="flex items-center gap-1.5">
                <Avatar name={person.name} className="h-3.5 w-3.5 text-[6px]" />
                <span className="w-[58px] shrink-0 truncate text-[7.5px] text-text-muted">
                  {person.name}
                </span>
                <span className="flex h-1 flex-1 overflow-hidden rounded-full bg-border/50">
                  {person.segments.map((value, index) => (
                    <span
                      key={index}
                      className={cn(
                        "h-full",
                        index === 0
                          ? "bg-accent"
                          : index === 1
                            ? "bg-danger"
                            : index === 2
                              ? "bg-text-muted/50"
                              : "bg-text-muted/25"
                      )}
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  ))}
                </span>
                <span className="w-3 text-right font-mono text-[7px] text-text-muted">{total}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function IssuesScreen() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[7.5px] uppercase tracking-[0.16em] text-text-muted">Core Web</p>
          <p className="mt-0.5 text-[13px] font-semibold tracking-tight">
            Issues <span className="font-normal text-text-muted">· 24</span>
          </p>
        </div>
        <span className="rounded bg-primary px-2 py-1 text-[8px] font-medium text-primary-foreground">
          New issue
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <span className="flex h-5 min-w-[120px] flex-1 items-center gap-1 rounded border border-border bg-surface px-1.5 text-[7.5px] text-text-muted">
          <Search className="h-2.5 w-2.5" />
          Search title or key…
        </span>
        {["Status", "Priority", "Severity", "Type"].map((filter) => (
          <span
            key={filter}
            className="rounded border border-border bg-surface px-1.5 py-1 text-[7.5px] text-text-muted"
          >
            {filter}
          </span>
        ))}
        <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-1 text-[7.5px] font-medium text-accent">
          Filters · 1
        </span>
      </div>

      <div className="mt-2.5 overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[42px_1fr_58px_38px] gap-2 border-b border-border bg-surface-elevated/50 px-2 py-1 text-[7px] uppercase tracking-[0.08em] text-text-muted sm:grid-cols-[46px_1fr_64px_44px_48px_20px]">
          <span>Key</span>
          <span>Title</span>
          <span>Status</span>
          <span>Priority</span>
          <span className="hidden sm:block">Severity</span>
          <span className="hidden sm:block">Owner</span>
        </div>
        {ISSUE_ROWS.map((issue) => (
          <div
            key={issue.key}
            className="grid grid-cols-[42px_1fr_58px_38px] items-center gap-2 border-b border-border/70 bg-surface px-2 py-1.5 last:border-0 sm:grid-cols-[46px_1fr_64px_44px_48px_20px]"
          >
            <span className="font-mono text-[7.5px] font-semibold text-text-muted">{issue.key}</span>
            <span className="truncate text-[8.5px] font-medium text-text">{issue.title}</span>
            <StatusPill status={issue.status} />
            <span
              className={cn(
                "text-[7px] font-medium uppercase tracking-[0.06em]",
                PRIORITY_CLASS[issue.priority]
              )}
            >
              {issue.priority}
            </span>
            <span className="hidden truncate text-[7.5px] text-text-muted sm:block">
              {issue.severity}
            </span>
            <span className="hidden sm:block">
              <Avatar name={issue.assignee} />
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between bg-surface px-2 py-1 text-[7px] text-text-muted">
          <span>Showing 1–5 of 24</span>
          <span className="flex items-center gap-1">
            <span className="rounded border border-border px-1">1</span>
            <span className="rounded border border-border px-1">2</span>
            <span className="rounded border border-border px-1">3</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function BoardScreen() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[7.5px] uppercase tracking-[0.16em] text-text-muted">Core Web</p>
          <p className="mt-0.5 text-[13px] font-semibold tracking-tight">
            Board <span className="font-normal text-text-muted">· 14 open</span>
          </p>
        </div>
        <span className="rounded border border-border bg-surface px-1.5 py-1 font-mono text-[7.5px] text-text-muted">
          group: status
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {BOARD_COLUMNS.map((column, index) => (
          <div
            key={column.id}
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border border-border/70 bg-surface/40 p-1.5",
              index === 3 && "hidden sm:flex"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[7.5px] font-medium text-text">
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[column.id].dot)} />
                {STATUS_META[column.id].label}
              </span>
              <span className="font-mono text-[7px] text-text-muted">{column.count}</span>
            </div>

            {column.cards.map((card) => (
              <div
                key={card.key}
                className={cn(
                  "rounded-md border border-border bg-surface p-1.5",
                  card.dragging &&
                    "-rotate-1 border-accent/50 shadow-md ring-1 ring-accent/20"
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[6.5px] font-semibold text-text-muted">
                    {card.key}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-accent/60" />
                </div>
                <p className="mt-0.5 line-clamp-2 text-[7.5px] font-medium leading-snug text-text">
                  {card.title}
                </p>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {card.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded bg-accent/10 px-1 py-px font-mono text-[6px] text-accent"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-1">
                  <span
                    className={cn(
                      "text-[6px]",
                      card.due === "Overdue" ? "font-semibold text-danger" : "text-text-muted"
                    )}
                  >
                    {card.due ?? "—"}
                  </span>
                  <Avatar name={card.assignee} className="h-3.5 w-3.5 text-[6px]" />
                </div>
              </div>
            ))}

            {column.id === "in_progress" && (
              <div className="flex h-8 items-center justify-center rounded-md border border-dashed border-accent/30 text-[6.5px] text-accent/70">
                drop here
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[7px] text-text-muted">
        <span>Optimistic move · rollback on failure</span>
        <span className="font-mono">6 columns · 14 cards</span>
      </div>
    </div>
  );
}

function IssueScreen() {
  return (
    <div className="grid gap-2.5 sm:grid-cols-[1fr_128px]">
      <div className="min-w-0">
        <div className="flex items-center gap-1 font-mono text-[7px] text-text-muted">
          <span>BUG</span>
          <span>/</span>
          <span>issues</span>
          <span>/</span>
          <span className="text-accent">BUG-1</span>
        </div>

        <p className="mt-1 text-[12.5px] font-semibold leading-snug tracking-tight">
          Fix token refresh race condition causing unexpected logouts on concurrent calls
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <StatusPill status="in_progress" />
          <span className="rounded border border-danger/25 bg-danger/10 px-1.5 py-px text-[7px] font-medium uppercase text-danger">
            urgent
          </span>
          <span className="rounded border border-warning/25 bg-warning/10 px-1.5 py-px text-[7px] font-medium uppercase text-warning">
            critical
          </span>
          <span className="rounded border border-border bg-surface px-1.5 py-px font-mono text-[6.5px] text-text-muted">
            security
          </span>
          <span className="rounded border border-border bg-surface px-1.5 py-px font-mono text-[6.5px] text-text-muted">
            frontend
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-[8px] leading-relaxed text-text-muted">
          When five concurrent requests trigger a 401, the refresh token is blacklisted by the first
          call and every other tab is logged out. Expected: subscribers queue until the first
          refresh resolves.
        </p>

        <div className="mt-2 rounded-md border border-accent/25 bg-accent/[0.04] p-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[7.5px] font-medium text-accent">
              <Sparkles className="h-2.5 w-2.5" />
              AI summary
            </span>
            <span className="font-mono text-[6.5px] uppercase tracking-[0.08em] text-text-muted">
              suggested by AI
            </span>
          </div>
          <p className="mt-1 text-[7.5px] leading-relaxed text-text">
            <span className="font-semibold">TL;DR</span> — refresh rotation races across tabs;
            a per-session mutex is the smallest safe fix.
          </p>
          <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
            <div>
              <p className="text-[6.5px] uppercase tracking-[0.1em] text-text-muted">Next steps</p>
              <p className="mt-0.5 flex items-start gap-1 text-[7px] leading-snug text-text-muted">
                <Check className="mt-px h-2 w-2 shrink-0 text-success" />
                Scope the lock to the session
              </p>
              <p className="mt-0.5 flex items-start gap-1 text-[7px] leading-snug text-text-muted">
                <Check className="mt-px h-2 w-2 shrink-0 text-success" />
                Add a multi-context e2e test
              </p>
            </div>
            <div>
              <p className="text-[6.5px] uppercase tracking-[0.1em] text-text-muted">
                Open question
              </p>
              <p className="mt-0.5 text-[7px] leading-snug text-text-muted">
                Should tabs coordinate through a BroadcastChannel?
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {TIMELINE.map((entry) => (
            <div key={entry.time} className="flex items-start gap-1.5">
              <Avatar name={entry.name} className="mt-px h-3.5 w-3.5 text-[6px]" />
              <p className="min-w-0 flex-1 truncate text-[7px] leading-snug text-text-muted">
                <span className="font-medium text-text">{entry.name}</span> {entry.text}
              </p>
              <span className="shrink-0 font-mono text-[6px] text-text-muted/70">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden sm:block">
        <div className="rounded-lg border border-border bg-surface p-2">
          <p className="text-[7px] uppercase tracking-[0.12em] text-text-muted">Properties</p>
          <div className="mt-1.5 space-y-1.5">
            {[
              { label: "Status", value: <StatusPill status="in_progress" /> },
              {
                label: "Priority",
                value: <span className="text-[7.5px] font-medium text-danger">Urgent</span>,
              },
              {
                label: "Severity",
                value: <span className="text-[7.5px] text-warning">Critical</span>,
              },
              { label: "Assignee", value: <Avatar name="Sarah Chen" /> },
              { label: "Reporter", value: <Avatar name="Demo Recruiter" /> },
              { label: "Due", value: <span className="text-[7.5px] text-danger">Yesterday</span> },
              {
                label: "Project",
                value: <span className="font-mono text-[7px] text-text-muted">BUG</span>,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-1">
                <span className="text-[6.5px] uppercase tracking-[0.06em] text-text-muted">
                  {row.label}
                </span>
                {row.value}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-1.5 rounded-lg border border-border bg-surface p-2">
          <p className="text-[7px] uppercase tracking-[0.12em] text-text-muted">Tabs</p>
          <div className="mt-1 flex gap-2 border-b border-border text-[7px]">
            <span className="relative pb-1 font-medium text-text">
              Details
              <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-accent" />
            </span>
            <span className="pb-1 text-text-muted">Activity · 6</span>
          </div>
          <p className="mt-1.5 text-[6.5px] leading-snug text-text-muted">
            Markdown comments, mentions and every field change land in one trail.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScreenFor({ tab }: { tab: TourId }) {
  switch (tab) {
    case "dashboard":
      return <DashboardScreen />;
    case "issues":
      return <IssuesScreen />;
    case "board":
      return <BoardScreen />;
    case "issue":
      return <IssueScreen />;
  }
}

const SCREEN_LABELS: Record<TourId, string> = {
  dashboard: "Dashboard preview with KPIs, trends, status splits and workload",
  issues: "Issues table preview with filters, status and priority columns",
  board: "Six-column Kanban board preview with a card being dragged",
  issue: "Issue detail preview with AI summary, properties and activity timeline",
};

/* -------------------------------------------------------------------------------------------------
 * The tour itself: accessible tabs + a faithful mock of the real app.
 * ----------------------------------------------------------------------------------------------- */

export function ProductTour({ onLaunchDemo }: { onLaunchDemo: () => void }) {
  const [active, setActive] = useState<TourId>("dashboard");
  const tabRefs = useRef<Record<TourId, HTMLButtonElement | null>>({
    dashboard: null,
    issues: null,
    board: null,
    issue: null,
  });

  const activeTab = TOUR_TABS.find((tab) => tab.id === active) ?? TOUR_TABS[0];
  const activeIndex = TOUR_TABS.findIndex((tab) => tab.id === active);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TOUR_TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + TOUR_TABS.length) % TOUR_TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TOUR_TABS.length - 1;
    else return;

    event.preventDefault();
    const nextId = TOUR_TABS[nextIndex].id;
    setActive(nextId);
    tabRefs.current[nextId]?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Product screens"
        className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
      >
        {TOUR_TABS.map((tab, index) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`tour-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tour-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              data-testid={`tour-tab-${tab.id}`}
              className={cn(
                "relative shrink-0 px-3 pb-2.5 pt-1.5 text-[12.5px] font-medium transition-colors",
                isActive ? "text-text" : "text-text-muted hover:text-text"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-0"
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_270px] lg:gap-8">
        <div
          key={activeTab.id}
          role="tabpanel"
          id={`tour-panel-${activeTab.id}`}
          aria-labelledby={`tour-tab-${activeTab.id}`}
          tabIndex={0}
          data-testid={`tour-panel-${activeTab.id}`}
          className="animate-rise"
        >
          <div role="img" aria-label={SCREEN_LABELS[activeTab.id]}>
            <div aria-hidden="true">
              <AppFrame
                active={
                  activeTab.id === "dashboard"
                    ? "Dashboard"
                    : activeTab.id === "issues"
                      ? "Issues"
                      : activeTab.id === "board"
                        ? "Board"
                        : "Issues"
                }
                route={activeTab.route}
              >
                <ScreenFor tab={activeTab.id} />
              </AppFrame>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
              {activeTab.kicker}
            </p>
            <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-text">
              {activeTab.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
              {activeTab.description}
            </p>

            <ul className="mt-4 space-y-2">
              {activeTab.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-[12px] text-text">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <Button variant="outline" size="sm" onClick={onLaunchDemo} className="w-full gap-1.5">
              Open this workspace
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <p className="text-center font-mono text-[9.5px] text-text-muted">
              {activeIndex + 1} / {TOUR_TABS.length} · seeded demo data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
