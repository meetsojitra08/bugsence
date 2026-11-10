import { GitPullRequest, Inbox, Layers, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  id: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Live demo", href: "#demo", id: "demo" },
  { label: "Before & after", href: "#comparison", id: "comparison" },
  { label: "Benefits", href: "#benefits", id: "benefits" },
];

export interface BenefitItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
}

export const BENEFITS: BenefitItem[] = [
  {
    id: "inbox-triage",
    icon: Inbox,
    title: "Inbox with AI triage",
    description:
      "Paste a stack trace, forwarded email, or Slack thread. BugSense writes the title, pulls out steps to reproduce, suggests priority when confidence is clear, and routes the report into your triage queue.",
    detail: "Keyboard triage · Rotation built in",
  },
  {
    id: "duplicate-detection",
    icon: Layers,
    title: "Duplicate detection",
    description:
      "Every incoming report is checked against open and recent issues in the same project so repeated customer bugs merge cleanly instead of creating noise on the board.",
    detail: "One-click merge · Keeps reporter context",
  },
  {
    id: "github-slack",
    icon: GitPullRequest,
    title: "GitHub and Slack built in",
    description:
      "Open a pull request mentioning the ticket key to transition status via GitHub webhooks, accept signed Slack /bug or email-relay webhooks, and draft reporter resolution notes.",
    detail: "GitHub webhooks · /bug · Email & Sentry",
  },
];

export const RAW_REPORT_SAMPLE = `From: support@acme.dev (forwarded)
"Customer on Safari 17 hit a blank screen applying a gift card after removing a coupon. Console shows:"

TypeError: Cannot read properties of undefined (reading 'cardBrand')
  at applyPaymentMethod (CheckoutForm.tsx:142:18)
  at handleSubmit (CheckoutForm.tsx:96:5)
  at HTMLFormElement.dispatchEvent`;

export const STRUCTURED_TICKET_SAMPLE = {
  key: "WEB-48",
  title: "Checkout crashes when applying gift card after removing coupon",
  type: "Bug",
  priority: "High",
  environment: "Safari 17 · macOS",
  reporter: "support@acme.dev",
  assignee: "Sarah Chen",
  steps: [
    "Add an item to cart and apply a discount coupon.",
    "Remove the coupon on the checkout step.",
    "Enter a gift card code and click Apply.",
  ],
  expected: "Gift card balance applies and payment total updates.",
  actual: "Checkout throws TypeError reading 'cardBrand' at CheckoutForm.tsx:142.",
};

export interface DemoStage {
  step: "paste" | "triaged" | "assigned";
  label: string;
  caption: string;
}

export const DEMO_STAGES: DemoStage[] = [
  {
    step: "paste",
    label: "1. Paste",
    caption: "Drop a stack trace, email, or screenshot straight into Capture.",
  },
  {
    step: "triaged",
    label: "2. Triaged",
    caption: "Title, type, priority, and repro steps are drafted in about a second.",
  },
  {
    step: "assigned",
    label: "3. Assigned",
    caption: "Accepted from Inbox, assigned to the active triager, and ready for a PR.",
  },
];
