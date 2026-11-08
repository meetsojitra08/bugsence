# 09 Notifications and Global Search

## Notifications
- Triggers: assigned to you, mentioned, status changed on your issue, new comment on watched issue.
- Backend: `Notification` model, list (unread filter), mark read, mark all read. Polling every 30s via TanStack Query `refetchInterval` (WebSocket/SSE as stretch).
- UI: bell with unread badge, popover list grouped by day, click navigates to issue and marks read.

## Global Search and Command Palette
- `Cmd/Ctrl+K` opens cmdk palette: search issues (by key or text), projects, people; actions (Create issue, Toggle theme, Go to Dashboard, Logout).
- Backend `GET /search?q=` returns grouped results (issues, projects) limited to user's projects.
- Recent items section; keyboard navigation; highlight matches.

## Acceptance Criteria
- Palette opens < 50ms, results < 300ms. No results from inaccessible projects.

## Tests
Notification creation per trigger; search scoping; palette keyboard behavior (RTL).

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
