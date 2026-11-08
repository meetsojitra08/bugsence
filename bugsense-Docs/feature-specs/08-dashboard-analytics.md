# 08 Dashboard and Analytics

## Goal
At-a-glance project health that looks stunning.

## Backend (`/projects/{id}/analytics/...`)
- `overview`: counts by status, priority, severity; open vs closed; overdue; avg resolution time (days).
- `trends`: issues created vs resolved per day for last 30/90 days.
- `workload`: open issues per assignee.
- Use aggregate queries (`Count`, `Avg`, `TruncDate`); cache 60s.

## Frontend
- KPI cards with animated count-up and delta vs previous period.
- Area chart (created vs resolved), donut (status), horizontal bars (workload), heat/priority breakdown.
- Date range selector (7/30/90 days). Recent activity feed. "AI insight" card (optional): one-sentence Gemini summary of the week.
- Charts themed with design tokens; tooltips polished; skeleton on load; empty state if no data.

## Acceptance Criteria
- Loads < 1s on seeded 1,000 issues. Responsive grid (1/2/4 columns).

## Tests
Aggregation correctness with factory data; permission scoping.

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
