# BugSense for Small Dev Teams: The Redesigned Flow

Small teams (2-10 devs) have no triage manager, no process, and no patience for ceremony. Bugs arrive from Slack messages, QA, customers, and Sentry, and someone has to decide quickly: is this real, is it a duplicate, who takes it, and is it blocking a release?

**New positioning:** *"The bug inbox for small dev teams. Paste it, we triage it, someone owns it, it ships."*

## Design principles

1. **Zero ceremony.** Creating a ticket takes under 15 seconds and one screen.
2. **Everything has an owner.** No issue sits unassigned for more than a day without being surfaced.
3. **The tool comes to the reports.** Slack, email, and GitHub are inputs, not afterthoughts.
4. **Closing the loop is built in.** The reporter hears when it's fixed.
5. **AI suggests, humans confirm in one click.**

## The new core loop

**Report arrives → Inbox → Triage (1 click) → Owner assigned → PR linked → Auto-closed on merge → Reporter notified**

## Screen-by-screen redesign

### 1. Home becomes "Today"

Replace the stats wall with a personal action list.

- **Top strip:** "3 new in Inbox · 2 assigned to you · 1 blocking release"
- **Section "Your work":** issues assigned to you, sorted by priority, with inline status buttons (Start, Ready for review, Done).
- **Section "Waiting on you":** PRs awaiting review, issues where you were @mentioned, issues you reported that were resolved.
- **Section "Team pulse" (2+ members only):** one line per person with their current in-progress issue, so standups become a glance.
- **Analytics move to a separate "Insights" page** that appears after 15+ issues. Until then, it's hidden.

### 2. Inbox (new, the most important screen)

All untriaged reports land here, not on the board. Layout is a two-pane list on the left and a preview on the right.

- Each row shows an AI-generated title, source badge (Slack, email, manual, Sentry), age, and a "Possible duplicate of BILL-12" chip when relevant.
- **One-click triage bar** on the preview: Accept (to Todo), Assign to \[suggested person\], Merge into duplicate, Snooze, Reject/Won't fix.
- **Keyboard flow:** `J/K` to move, `A` to assign, `M` to merge, `E` to accept, `X` to reject. A team lead should clear 10 reports in under two minutes.
- **Triage rotation:** a setting for "this week's triager" (rotating daily or weekly). The Inbox badge pings only that person, with a nudge to everyone if something sits over 24 hours.

### 3. Capture (replaces the two-step modal)

Single screen, opens with `C` or from the global button.

- **Giant "Paste anything" field,** focused on open. Paste a stack trace, Slack message, or screenshot. Triage runs automatically after \~1 second, with no button.
- **Below it, live-filling fields:** human-readable title, type, priority, assignee suggestion, and labels, each editable inline.
- **Duplicate check appears inline:** "Looks similar to BILL-2 (82%). View · Link · It's different."
- **Confidence handling:** if confidence is low, show what's missing ("Add the browser and steps to improve this") rather than a bare percentage. Don't pre-fill priority when confidence is under about 60%. Leave it blank with a nudge.
- **Reproduction fields** stay collapsed and auto-fill when the AI can. Only expand them if the user wants.
- **Primary button:** "Create" (`⌘Enter`). Secondary: "Create and add another."
- **Reporter field** (optional): "Who reported this?" so you can notify them later, including non-users via email.

### 4. Issue detail

Make it the place where work happens.

- **Order:** title → description → metadata sidebar → discussion. Drop the AI summary unless there are 5+ comments.
- **Metadata:** status, priority, assignee, type, labels, due date, reporter, linked PRs, related issues.
- **Comments with @mentions** and image paste, in a single timeline with activity events (status changes, PR linked).
- **"Next steps"** become a real checklist that can convert into sub-issues.
- **GitHub block:** "Create branch" (copies `bill-4-fix-issuelist-map`), shows linked PRs with CI status, auto-moves to In Review on PR open and Done on merge.
- **Resolve with note:** one field, "What fixed it?" This feeds a changelog and tells the reporter.
- **Copy-link button** and a real URL per issue.
- **Delete** becomes archive with undo.

### 5. Board

- **Four columns by default:** Todo, In Progress, In Review, Done. Backlog and Closed are optional toggles.
- **Filters:** assignee ("Only me"), priority, label. Remove status chips.
- **Card:** key, title, priority icon (distinct shapes, not just flames), assignee avatar, due date only if set. Show a linked-PR icon with CI state.
- **Inline add:** type a title, hit Enter, done.
- **Aging indicator:** a subtle badge when a card has been in a column over 3 days.
- **Fit on screen:** four columns at fixed max width eliminates the horizontal overflow.

### 6. Issues list (secondary view)

Keep it for search and bulk work, but make it work as a power tool.

- **Saved views:** My issues, Unassigned, Overdue, Recently closed.
- **Columns:** key, title, status, priority, assignee, type, updated. Drop empty Labels and Actions until they're real.
- **Bulk select** with assign, status, and label actions.
- **Hide pagination** until over 25 items.

### 7. Team and invites

- **Invite by email or a shareable link** with a default role. Works for people without accounts.
- **Pending invites list** with resend and revoke.
- **Three roles only:** Owner, Member, Viewer (for stakeholders and QA). Show a small permissions explainer.
- **Per-member row:** open issues count and last active.
- **Actions:** change role, remove.

### 8. Integrations (new, in Settings)

For small teams this is where adoption is won or lost. In priority order:

1. **GitHub:** link PRs and auto-close on merge.
2. **Slack:** `/bug` command or an emoji reaction that sends a message to the Inbox, plus a channel notification when issues are assigned or resolved.
3. **Email-in:** `bugs@yourproject.bugsense.app` forwards into the Inbox.
4. **Sentry/error tracker webhook:** auto-create from new errors, deduplicated.
5. **Public report form:** a shareable link for QA and customers.

### 9. Settings

- **Split into Account and Project.** Project settings cover name, key, labels, default assignee, triage rotation, AI behavior, and archive/delete.
- **Notifications:** per-event toggles for in-app, email, and Slack.
- **Account:** show/hide password, timezone, avatar, and an explanation for the locked email field.
- **Hide vendor names** like Groq from users.

### 10. Landing page

- **Hero:** "Messy bug report in. Clear ticket out." with a 10-second looping demo of paste → triaged → assigned.
- **A before/after block:** raw stack trace on the left, finished ticket on the right.
- **Three benefits only:** Inbox with AI triage, duplicate detection, GitHub and Slack built in.
- **A "Try the demo workspace"** button that needs no signup.
- **Remove any claim** the product doesn't yet back up (96% confidence, "Sarah moved status").
- **One primary CTA,** repeated, not three variants.

### 11. Onboarding (first 5 minutes)

1. Create a project (name only, key auto-generated).
2. "Paste a real bug you're dealing with." This is the aha moment. Run triage live.
3. "Invite your team" with a link to copy.
4. "Connect GitHub" (skippable).

This replaces the checklist card on the dashboard, and the checklist disappears when done.

### 12. Global polish

- **Brand vs. alert color:** use a neutral or blue accent for selection and brand, and keep red for urgent and destructive only.
- **One page width grid** across all screens.
- **Consistent terms:** Workspace → Project. Drop "Team" as a nav label and call it "Members."
- **Proper plurals,** a platform-aware shortcut label (⌘ vs Ctrl), and "–" instead of "0d" when no data exists.
- **Notifications** for assignments, mentions, PR status, and Inbox arrivals.
- **Mobile-first for triage:** Inbox and issue detail must work one-handed on a phone.

## Trust bugs to fix right now

- Priority shown as High at creation became Medium on the issue.
- Assignee and due date appeared despite "Leave unassigned" and no date picked.
- "50% confidence" with no explanation.
- Landing page numbers that the real app doesn't reproduce.

## Build order

| Phase | Scope | Why |
| --- | --- | --- |
| 1 | Fix trust bugs, single-screen Capture with auto-triage and duplicate check | This is your core value |
| 2 | Inbox with keyboard triage, "Today" home | Gives the loop a front door |
| 3 | Comments, @mentions, notifications, email and link invites | Makes it a team tool |
| 4 | GitHub integration, then Slack | Retention and daily habit |
| 5 | Board cleanup, saved views, bulk actions | Polish |
| 6 | Landing rewrite, demo workspace, onboarding | Only once the product earns the claims |

## How you'll know it works

- Time from report to assigned owner: under 5 minutes.
- Share of issues created from Slack, email, or paste rather than the full form.
- Share of issues auto-closed from PR merge.
- Reporters notified on resolution.
- A team of 3 using it daily for two weeks without being asked.
