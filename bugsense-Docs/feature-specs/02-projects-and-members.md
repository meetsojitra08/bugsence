# 02 Projects and Members

## Goal
Workspaces for teams with role-based access.

## User Stories
- Create a project with a name, unique key (e.g. `WEB`), description.
- Invite existing users by email and assign a role; change or remove members.
- Switch between projects quickly; archive projects.

## Backend
- Models: `Project`, `Membership` (roles owner/admin/member/viewer). Creator becomes owner automatically.
- Endpoints per `architecture-context.md`. Project list returns only projects the user belongs to.
- Permission classes: `IsProjectMember`, `IsProjectAdmin`, `IsProjectOwner`.
- Cannot remove the last owner. Key is immutable after creation.

## Frontend
- Sidebar project list with colored initials; project switcher in topbar (`Cmd+P`).
- Create project modal with live key suggestion from name.
- Settings > Members table: avatar, role select, remove with confirm.
- Empty state for first-time users: guided "Create your first project".

## Acceptance Criteria
- Non-members get 404 on a project; viewers cannot mutate.
- Role changes take effect immediately in UI (hide disallowed actions).

## Tests
Role matrix permission tests; last-owner protection; key uniqueness.

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
