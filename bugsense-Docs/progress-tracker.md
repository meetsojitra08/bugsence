# Progress Tracker

> Update this file at the end of every session. Mark `[x]` only when the Definition of Done is met **and the step has its own verified conventional commit** (see `ai-workflow-rules.md` section 4).

**Commit convention:** one separate commit per completed, verified step; one closing `docs(tracker): complete phase N ...` commit per phase. Log every commit in the Commit Log below.

**Current phase:** Phase 0
**Last updated:** 2026-11-08
**Next task:** Phase 0, task 4

## Phase 0: Setup
_Phase-closing commit:_ `docs(tracker): complete phase 0 project setup`
- [x] Create GitHub repo, `.gitignore`, README skeleton, LICENSE
- [x] Scaffold Django project (`config/`, split settings, django-environ)
- [x] Configure PostgreSQL (docker-compose) + pgvector extension
- [x] Install DRF, simplejwt, corsheaders, drf-spectacular (OpenAPI docs)
- [x] Scaffold React + Vite + TS + Tailwind + shadcn/ui + TanStack Query + Router
- [ ] Configure ruff, eslint, prettier, pre-commit hooks
- [ ] GitHub Actions CI (lint + test + build)
- [x] `.env.example` for backend and frontend

## Phase 1: Auth and Foundation (spec 01)
_Phase-closing commit:_ `docs(tracker): complete phase 1 auth and foundation`
- [ ] Custom User model, register/login/refresh/logout, `users/me`
- [ ] Frontend auth pages, protected routes, token refresh interceptor
- [ ] App shell: sidebar, topbar, theme toggle, command palette skeleton

## Phase 2: Projects and Members (spec 02)
_Phase-closing commit:_ `docs(tracker): complete phase 2 projects and members`
- [ ] Project + Membership models, role permissions
- [ ] Project CRUD UI, member invite/manage UI

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
| 3 | Phase 0 / frontend scaffold | `chore(setup): scaffold React app with Vite, Tailwind and shadcn/ui` | | [ ] |
| 4 | Phase 0 / CI | `ci: add GitHub Actions workflow for lint, test and build` | | [ ] |
| | | | | |

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

## Known Issues / Tech Debt
- (none yet)
