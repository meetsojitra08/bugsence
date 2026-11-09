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

/* Public page navigation. */

export interface NavItem {
  label: string;
  href: string;
  id: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Features", href: "#features", id: "features" },
  { label: "Workflow", href: "#workflow", id: "workflow" },
  { label: "FAQ", href: "#faq", id: "faq" },
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
    title: "Turn rough reports into clear issues",
    body: "Start with a stack trace or a short QA note. AI can suggest a title, type, priority, severity, reproduction steps and labels. Review and edit every suggestion before saving.",
    meta: "AI suggestions · always editable",
    span: "wide",
    visual: "triage",
  },
  {
    icon: CopyX,
    title: "Spot similar reports early",
    body: "Check a new report against issues in the same project and surface likely matches, so the team can build on existing context.",
    meta: "Project-scoped similarity search",
    span: "normal",
    visual: "duplicates",
  },
  {
    icon: LayoutGrid,
    title: "A board that shows the next step",
    body: "Move issues across six workflow statuses, add work directly to a column and keep ownership visible as the team makes progress.",
    meta: "Six workflow states",
    span: "normal",
    visual: "board",
  },
  {
    icon: BarChart3,
    title: "Understand project health at a glance",
    body: "Review issue counts, created and resolved trends, severity and workload to see where attention is needed.",
    meta: "Project trends · workload · status",
    span: "normal",
    visual: "analytics",
  },
  {
    icon: Clock3,
    title: "One timeline for every change",
    body: "Keep comments, mentions and issue changes together so the decisions behind a fix stay easy to find.",
    meta: "Comments · mentions · activity",
    span: "normal",
    visual: "timeline",
  },
  {
    icon: Command,
    title: "Move quickly with search and shortcuts",
    body: "Search across issues, projects and teammates, then move through common actions with keyboard shortcuts or the controls on screen.",
    meta: "Search · quick create · shortcuts",
    span: "wide",
    visual: "keys",
  },
  {
    icon: SunMoon,
    title: "A workspace that suits your team",
    body: "Choose a warm light interface or a focused dark theme, with keyboard access and reduced-motion support built in.",
    meta: "Light and dark themes · accessible controls",
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
    title: "Start with the report you have",
    body: "Paste a stack trace, a QA note or a short description. Keep the original context while you prepare a clear issue.",
    detail: "Issue fields remain yours to edit",
  },
  {
    number: "02",
    title: "Review AI suggestions",
    body: "When AI is configured, BugSense can suggest useful issue fields and a possible cause from the report.",
    detail: "Suggestions are optional and editable",
  },
  {
    number: "03",
    title: "Check for similar issues",
    body: "Look for related reports in the project before creating another issue, and reuse the context your team already has.",
    detail: "Matches are surfaced for review",
  },
  {
    number: "04",
    title: "Keep the team moving",
    body: "Assign the work, discuss it in context and move it through the board until it is resolved.",
    detail: "One issue record from report to resolution",
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

/* FAQ content. */

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: "How does AI triage work?",
    a: "When Groq is configured, BugSense can suggest issue fields and a possible cause from a report. Review and edit suggestions before saving them.",
  },
  {
    q: "Can I use BugSense without AI?",
    a: "Yes. Create, assign, prioritize and track issues, and collaborate with your team without enabling AI features.",
  },
  {
    q: "How does BugSense help with duplicate issues?",
    a: "BugSense compares a report with issues in the same project and surfaces likely matches for your team to review before creating new work.",
  },
  {
    q: "How does BugSense manage team access?",
    a: "Invite teammates to projects and assign owner, admin, member or viewer roles to control access to project work.",
  },
  {
    q: "Can I self-host BugSense?",
    a: "Yes. BugSense is open source under the MIT License. Visit the GitHub repository for the source code and setup instructions.",
  },
  {
    q: "What can my team manage in BugSense?",
    a: "Create projects, invite teammates with project roles, track issues across six statuses, collaborate with comments and mentions, and review project analytics.",
  },
];
