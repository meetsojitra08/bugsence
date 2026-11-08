# Feature Specs Index

Build in order. Each spec has: Goal, User Stories, Backend, Frontend, Acceptance Criteria, Tests.

| # | Spec | Phase |
|---|---|---|
| 01 | `01-authentication.md` | 1 |
| 02 | `02-projects-and-members.md` | 2 |
| 03 | `03-issues-core.md` | 3 |
| 04 | `04-kanban-board.md` | 4 |
| 05 | `05-comments-and-activity.md` | 5 |
| 06 | `06-ai-triage.md` | 6 |
| 07 | `07-duplicate-detection-and-summary.md` | 6 |
| 08 | `08-dashboard-analytics.md` | 7 |
| 09 | `09-notifications-and-search.md` | 7 |
| 10 | `10-landing-and-polish.md` | 8 |
| 11 | `11-deployment.md` | 8 |

## Commit Requirement (applies to every spec)
Each spec is built as a series of **separate, verified, conventional commits** (models/migrations, services and API, tests, frontend API layer, UI, docs/tracker). Never commit before the step is verified. Full rules: `ai-workflow-rules.md` section 4.

Suggested commit sequence per feature:
1. `feat(<scope>): add <model> model and migrations`
2. `feat(<scope>): add <resource> API endpoints and permissions`
3. `test(<scope>): cover <resource> endpoints and permissions`
4. `feat(<scope>): add frontend API hooks for <resource>`
5. `feat(ui): build <screen> with loading, empty and error states`
6. `style(<scope>): polish <screen> spacing and motion` (if needed)
7. `docs(tracker): complete <feature> and log commits`
