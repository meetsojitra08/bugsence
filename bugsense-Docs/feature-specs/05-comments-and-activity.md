# 05 Comments and Activity

## Goal
Conversation and a transparent audit trail on every issue.

## Backend
- `Comment` CRUD (author or admin can edit/delete; show "edited").
- `@mention` parsing: `@email-prefix` or user id token creates a Notification.
- `GET issues/{id}/activity` merged with comments for a unified timeline (ordered by time).

## Frontend
- Timeline: comments as cards, activity as compact one-liners ("Priya changed status from Todo to In Progress").
- Markdown composer with `@` mention autocomplete, `Cmd+Enter` to send, optimistic append.
- Relative timestamps with tooltip for absolute time. Grouped consecutive activity.

## Acceptance Criteria
- Mentioned users get a notification. Deleted comments leave no broken UI.

## Tests
Edit/delete permission, mention parsing, timeline ordering.

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
