# Progress Tracker

> Update this file at the end of every session. Mark `[x]` only when the Definition of Done is met **and the step has its own verified conventional commit** (see `ai-workflow-rules.md` section 4).

**Commit convention:** one separate commit per completed, verified step; one closing `docs(tracker): complete phase N ...` commit per phase. Log every commit in the Commit Log below.

**Current phase:** Phase 1
**Last updated:** 2026-11-08
**Next task:** Phase 1, task 4 (App shell layout with sidebar, topbar and command palette)

## Phase 0: Setup
_Phase-closing commit:_ `docs(tracker): complete phase 0 project setup`
- [x] Create GitHub repo, `.gitignore`, README skeleton, LICENSE
- [x] Scaffold Django project (`config/`, split settings, django-environ)
- [x] Configure PostgreSQL (docker-compose) + pgvector extension
- [x] Install DRF, simplejwt, corsheaders, drf-spectacular (OpenAPI docs)
- [x] Scaffold React + Vite + TS + Tailwind + shadcn/ui + TanStack Query + Router
- [x] Configure ruff, eslint, prettier, pre-commit hooks
- [x] GitHub Actions CI (lint + test + build)
- [x] `.env.example` for backend and frontend

## Phase 1: Auth and Foundation (spec 01)
_Phase-closing commit:_ `docs(tracker): complete phase 1 auth and foundation`
- [x] Custom User model, register/login/refresh/logout, `users/me`
- [x] Frontend auth pages, protected routes, token refresh interceptor
- [x] App shell: sidebar, topbar, theme toggle, command palette skeleton

## Phase 2: Projects and Members (spec 02)
_Phase-closing commit:_ `docs(tracker): complete phase 2 projects and members`
- [x] Project + Membership models, role permissions
- [x] Project CRUD UI, member invite/manage UI

## Phase 3: Issues Core (spec 03)
_Phase-closing commit:_ `docs(tracker): complete phase 3 issues core`
- [x] Issue/Label models, numbering, CRUD, filters, search, pagination
- [x] List view, create modal, detail panel

## Phase 4: Board (spec 04)
_Phase-closing commit:_ `docs(tracker): complete phase 4 kanban board`
- [x] Move endpoint + ordering, dnd-kit board, optimistic updates

## Phase 5: Comments and Activity (spec 05)
_Phase-closing commit:_ `docs(tracker): complete phase 5 comments and activity`
- [x] Comments CRUD, activity log, timeline UI

## Phase 6: AI Features (specs 06, 07)
_Phase-closing commit:_ `docs(tracker): complete phase 6 AI features`
- [ ] Gemini service wrapper, throttling, logging
- [ ] AI triage endpoint + UI
- [ ] Embeddings + duplicate detection
- [ ] Issue summary

## Phase 7: Dashboard and Notifications (specs 08, 09)
_Phase-closing commit:_ `docs(tracker): complete phase 7 dashboard and notifications`
- [ ] Analytics endpoints + charts
- [ ] Notifications + bell UI
- [ ] Global search / command palette wiring

## Phase 8: Polish, Landing, Deploy (specs 10, 11)
_Phase-closing commit:_ `docs(tracker): complete phase 8 polish, landing and deployment`
- [ ] Marketing landing page
- [ ] Accessibility, performance, and responsive audit
- [ ] Seed demo data command, demo account
- [ ] Deploy backend, frontend, DB; production smoke test
- [ ] README with GIF, architecture diagram, live link
- [ ] Postman collection exported to `/docs/postman`

## Commit Log
| # | Phase / Step | Commit message | Hash | Verified (lint/tests/manual) |
|---|---|---|---|---|
| 1 | Phase 0 / repo init | `chore(setup): initialize repository with README and gitignore` | a2aefe5 | [x] |
| 2 | Phase 0 / backend scaffold | `chore(setup): scaffold Django project with split settings` | 7fa39a8 | [x] |
| 3 | Phase 0 / frontend scaffold | `chore(setup): scaffold React app with Vite, Tailwind and shadcn/ui` | fdd4c8c | [x] |
| 4 | Phase 0 / CI | `ci: add GitHub Actions workflow for lint, test and build` | a4a8af0 | [x] |
| 5 | Phase 0 / closing | `docs(tracker): complete phase 0 project setup` | d060d58 | [x] |
| 6 | Phase 1 / auth backend | `feat(auth): add custom User model and JWT auth endpoints` | 4c34bd5 | [x] |
| 7 | Phase 1 / auth tests | `test(auth): cover registration, token rotation, logout and profile endpoints` | 1e53063 | [x] |
| 8 | Phase 1 / frontend auth API | `feat(auth): implement auth state, interceptors and protected routes` | 68d2e30 | [x] |
| 9 | Phase 1 / auth pages | `feat(ui): build login and register pages with split layout and demo login` | 51532d8 | [x] |
| 10 | Phase 1 / app shell | `feat(ui): build app shell layout with sidebar, topbar and command palette` | db9c185 | [x] |
| 11 | Phase 1 / closing | `docs(tracker): complete phase 1 auth and foundation` | 4f3f9c1 | [x] |
| 12 | Phase 2 / models | `feat(projects): add Project and Membership models with role enum` | f778e9b | [x] |
| 13 | Phase 2 / API | `feat(projects): implement scoped project and member management endpoints` | e641fd4 | [x] |
| 14 | Phase 2 / tests | `test(projects): cover project isolation, role matrix and last-owner protection` | 91817b6 | [x] |
| 15 | Phase 2 / frontend API | `feat(projects): add projects API client and active project context` | f89e108 | [x] |
| 16 | Phase 2 / UI | `feat(ui): build project switcher, creation modal and member management table` | 235aff5 | [x] |
| 17 | Phase 2 / closing | `docs(tracker): complete phase 2 projects and members` | e88ac1d | [x] |
| 18 | Phase 3 / models | `feat(issues): add Label, Issue and Activity models with per-project numbering sequence` | 28d0e54 | [x] |
| 19 | Phase 3 / API | `feat(issues): implement issue CRUD, activity logging and label endpoints` | 2e635cb | [x] |
| 20 | Phase 3 / tests | `test(issues): cover numbering sequence, filtering, activity logging and permissions` | 6c0afbf | [x] |
| 21 | Phase 3 / frontend API | `feat(issues): add issues API client and URL-synced filter hooks` | cdd9ad2 | [x] |
| 22 | Phase 3 / UI | `feat(ui): build issue list view with filter bar and quick create modal` | 7efe3ca | [x] |
| 23 | Phase 3 / closing | `docs(tracker): complete phase 3 issues core` | a49c657 | [x] |
| 24 | Phase 4 / backend | `feat(board): implement issue move endpoint with midpoint rebalancing and board column API` | bdc30bf | [x] |
| 25 | Phase 4 / tests | `test(board): cover issue move positioning, rebalancing threshold and board grouping` | 363df14 | [x] |
| 26 | Phase 4 / frontend API | `feat(board): add board API client with optimistic column reordering and rollback` | eaa19b6 | [x] |
| 27 | Phase 4 / UI | `feat(ui): build interactive kanban board with drag and drop, quick add and column filters` | 3c4c40d | [x] |
| 28 | Phase 4 / closing | `docs(tracker): complete phase 4 kanban board` | 68ec5d2 | [x] |
| 29 | Phase 5 / backend | `feat(comments): add Comment model, mention notifications and unified activity timeline API` | 715905e | [x] |
| 30 | Phase 5 / tests | `test(comments): cover comment permissions, mention notifications and timeline ordering` | 7fd2c4d | [x] |
| 31 | Phase 5 / frontend API | `feat(comments): add comments API client and optimistic timeline hooks` | 3718594 | [x] |
| 32 | Phase 5 / UI | `feat(ui): build issue activity timeline, comment composer with mention autocomplete and markdown support` | b703e5c | [x] |
| 33 | Phase 5 / closing | `docs(tracker): complete phase 5 comments and activity` | 4186770 | [x] |

## Decision Log
| Date | Decision | Reason |
|---|---|---|
| | | |

## Session Log
| Date | What was done | Blockers | Next |
|---|---|---|---|
| 2026-11-08 | Initialized git repository, added .gitignore, LICENSE, and README skeleton | None | Phase 0, task 2: Backend scaffold |
| 2026-11-08 | Scaffolded Django 5 backend with split settings, DRF, SimpleJWT, drf-spectacular, PostgreSQL pgvector docker-compose, and health tests | None | Phase 0, task 3: Frontend scaffold |
| 2026-11-08 | Scaffolded React 18 + Vite + TypeScript frontend with Tailwind CSS design tokens, shadcn Button primitive, TanStack Query, and Vitest suite | None | Phase 0, task 4: Tooling & Pre-commit hooks |
| 2026-11-08 | Configured ESLint, Prettier, pre-commit hooks, and GitHub Actions CI workflow covering backend & frontend lint, tests, and build | None | Phase 0 closing commit |
| 2026-11-08 | Implemented custom User model, migrations, registration, login, token refresh, logout (blacklist), and me/change-password endpoints | None | Phase 1: Auth test suite |
| 2026-11-08 | Created full auth test suite covering registration, duplicate rejection, login, generic error responses, token rotation, logout blacklist, and me endpoints | None | Phase 1: Frontend auth integration |
| 2026-11-08 | Implemented frontend auth API layer, token management with silent 401 refresh queue, AuthContext/useAuth hook, and ProtectedRoute guard | None | Phase 1: Auth pages UI |
| 2026-11-08 | Built premium login and register pages with split layout, password strength meter, show/hide toggle, and 1-click recruiter demo mode | None | Phase 1: App shell foundation |
| 2026-11-08 | Built responsive App Shell with collapsible sidebar, topbar breadcrumbs/quick actions, cmdk command palette (⌘K), and dashboard shell | None | Phase 1 closing & verification |
| 2026-11-08 | Verified full Phase 1 gates across backend and frontend, completed Phase 1 documentation | None | Phase 2: Projects and Members (spec 02) |
| 2026-11-08 | Added Project and Membership models, RoleChoices enum, key immutability, unique constraints, and initial migrations | None | Phase 2: Project & member API endpoints |
| 2026-11-09 | Implemented scoped project CRUD, member invitations, role management, sole-owner protection, and OpenAPI documentation | None | Phase 2: Project test suite |
| 2026-11-09 | Added 24 pytest tests covering project isolation, role matrix permissions, key immutability, and sole-owner protection | None | Phase 2: Frontend projects API & state |
| 2026-11-09 | Built frontend projects API client, TanStack Query hooks, Zustand active project store, and unit tests | None | Phase 2: Project switcher and members UI |
| 2026-11-09 | Built ProjectSwitcher, CreateProjectModal with live key generator, and ProjectMembersPage with invite/roles/remove | None | Phase 2 closing & verification |
| 2026-11-09 | Completed and verified Phase 2 across backend and frontend (41 pytest tests, 17 vitest tests, build gates clean) | None | Phase 3: Issues Core (spec 03) |
| 2026-11-09 | Added Label, Issue, and Activity models with per-project sequence numbering, pgvector embeddings, and initial migrations | None | Phase 3: Issue & Label API endpoints |
| 2026-11-09 | Implemented issue CRUD, filtering, pagination, activity logging, undo/restore, and label endpoints | None | Phase 3, task 3: Backend issue test suite |
| 2026-11-09 | Added 16 pytest tests covering issue numbering concurrency, filters, role permissions, activity logs, and undo | None | Phase 3, task 4: Frontend issues API & hooks |
| 2026-11-09 | Built frontend issues API client with demo mode, TanStack Query hooks, URL filter synchronization, and unit tests | None | Phase 3, task 5: Issue list view & create modal UI |
| 2026-11-09 | Built dense issue list table, status chips filter bar, quick create modal (shortcut 'C'), detail side panel, full page route, SafeMarkdown sanitization, and UI tests | None | Phase 3 closing & merge |
| 2026-11-09 | Completed Phase 3 Issues Core across backend and frontend (57 pytest tests, 33 vitest tests, all gates clean) | None | Phase 4: Kanban Board (spec 04) |
| 2026-11-09 | Implemented board issue move endpoint with float midpoint positioning, rebalancing under 1e-6 gap threshold, and column serializer | None | Phase 4, task 2: Board test suite |
| 2026-11-09 | Added 12 pytest tests covering midpoint positioning, rebalancing threshold, move authorization, and board status grouping | None | Phase 4, task 3: Frontend board API & optimistic hooks |
| 2026-11-09 | Added frontend board API, TanStack Query useBoard hook, optimistic column reordering with cache rollback, and unit tests | None | Phase 4, task 4: Kanban board UI with drag-and-drop |
| 2026-11-09 | Built interactive dnd-kit Kanban board with drag overlay lift/tilt, quick-add at column bottoms, view switcher pills, and verified full monorepo test suite (69 pytest, 41 vitest) | None | Phase 5: Comments & Activity (spec 05) |
| 2026-11-09 | Added Comment & Notification models, mention parser, comment CRUD services, and unified activity+comments timeline API | None | Phase 5, task 2: Comments test suite |
| 2026-11-09 | Added 18 pytest tests covering comment creation, edit/delete role matrix permissions, @mention notifications, and chronological timeline ordering | None | Phase 5, task 3: Frontend comments API & timeline hooks |
| 2026-11-09 | Added comments API client, TanStack Query timeline hooks, optimistic creation and rollback, and unit tests | None | Phase 5, task 4: Comments and activity timeline UI |
| 2026-11-09 | Built activity timeline stream, comment cards with author avatars/edit/delete, markdown composer with @mention autocomplete, and verified monorepo test suite (87 pytest, 51 vitest) | None | Phase 6: AI Features (spec 06, 07) |

## Known Issues / Tech Debt
- (none yet)
