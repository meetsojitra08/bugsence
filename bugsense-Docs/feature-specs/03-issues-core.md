# 03 Issues Core

## Goal
Fast, rich issue management: the heart of the product.

## User Stories
- Create an issue with title, description, type, priority, severity, assignee, labels, due date, steps/expected/actual/environment.
- View issues in a list with filters, sorting, search, grouping, and bulk actions.
- Edit any field inline; delete with undo.

## Backend
- Models: `Issue`, `Label`. Per-project `number` allocated inside `transaction.atomic` (select_for_update on project row). Display key = `{project.key}-{number}`.
- Endpoints: list (filters: status, priority, severity, type, assignee, label, reporter, due, `search`), create, retrieve, partial update, delete.
- Search: Postgres full text (SearchVector on title+description) with trigram fallback.
- Every update writes `Activity` entries (diff old/new).
- Soft-delete optional (`deleted_at`) to support undo.

## Frontend
- List view: dense table, sticky header, column picker, inline edit for status/priority/assignee via popovers, row hover actions, multi-select bulk bar.
- Filter bar with chips, saved views (local storage for MVP), debounced search.
- Create modal (`C` shortcut): title first, expandable details; markdown editor with preview.
- Issue detail: right-side panel + full page route `/p/:key/issues/:number`.
- Skeletons, empty states ("No issues match your filters" + clear filters).

## Acceptance Criteria
- Create to visible in list < 300ms perceived (optimistic).
- Filters persist in URL query string (shareable).
- Markdown rendered safely (sanitized).

## Tests
Numbering concurrency, filter combos, permission per role, activity diff generation, XSS sanitization.

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
