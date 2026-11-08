# 04 Kanban Board

## Goal
A buttery-smooth drag-and-drop board that feels like Linear.

## User Stories
- See issues grouped by status in columns; drag between and within columns.
- Quick-add an issue at the bottom of any column.
- Filter the board by assignee, label, priority.

## Backend
- `POST /issues/{id}/move` body: `{status, before_id?, after_id?}`; computes float `position` as midpoint of neighbors; re-balance when gap < 1e-6.
- Writes activity entry `status_changed`. Wrapped in a transaction.
- Board endpoint returns issues grouped by status with limited page size per column (load more).

## Frontend
- dnd-kit with sortable columns and cards, drag overlay with lift/tilt, drop placeholder, auto-scroll.
- Optimistic move with rollback + toast on failure.
- Column header: status dot, count, "+" quick add. Collapsible columns.
- Cards: key (mono), title (2-line clamp), priority icon, labels (max 2 + count), assignee avatar, due date chip (red if overdue).
- Keyboard-accessible move (select card, arrow keys + announce via ARIA live region).
- Mobile: horizontal snap scroll; long-press to drag.

## Acceptance Criteria
- 60fps with 200 cards; no flicker on refetch.
- Concurrent edit does not corrupt order (last-write-wins acceptable, no crashes).

## Tests
Position calc unit tests, rebalance, move permission, optimistic rollback (frontend).

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
