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
- [ ] Issue/Label models, numbering, CRUD, filters, search, pagination
- [ ] List view, create modal, detail panel

## Phase 4: Board (spec 04)
_Phase-closing commit:_ `docs(tracker): complete phase 4 kanban board`
- [ ] Move endpoint + ordering, dnd-kit board, optimistic updates

## Phase 5: Comments and Activity (spec 05)
_Phase-closing commit:_ `docs(tracker): complete phase 5 comments and activity`
- [ ] Comments CRUD, activity log, timeline UI

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
| 18 | Phase 3 / models | `feat(issues): add Label, Issue and Activity models with per-project numbering sequence` | 3ae4990 | [x] |

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

## Known Issues / Tech Debt
- (none yet)
