# Project Overview: BugSense AI

> AI-powered bug tracking SaaS. Linear-level polish, Groq-powered intelligence.

## 1. Vision
A bug tracker that feels as fast and beautiful as Linear, and removes the tedious parts of triage with AI: auto-classification, severity/priority suggestions, duplicate detection, and plain-English summaries.

## 2. Target Users
| Persona | Needs |
|---|---|
| Developer | Fast issue capture, clear assignments, keyboard shortcuts |
| QA Engineer | Rich bug reports (steps, environment, attachments) |
| Project Manager | Dashboards, workload view, release health |
| Admin / Owner | Team, roles, project settings |

## 3. Core Value Props
1. **Speed**: optimistic UI, keyboard-first, command palette.
2. **AI triage**: paste a messy bug description, get a structured, labelled, prioritized issue.
3. **Duplicate prevention**: semantic similarity warns before creating dupes.
4. **Clarity**: beautiful dashboards and a drag-and-drop Kanban board.

## 4. Tech Stack
| Layer | Choice |
|---|---|
| Backend | Python 3.12, Django 5, Django REST Framework |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| Database | PostgreSQL 16 (+ pgvector for embeddings) |
| AI | Groq API (`groq` SDK) for triage and summaries |
| Auth | JWT (`djangorestframework-simplejwt`) |
| API testing | Postman collection + pytest |
| VCS | Git + GitHub (GitHub Actions CI) |
| Deploy | Frontend: Vercel. Backend: Render/Railway. DB: Neon/Supabase |

## 5. MVP Scope (v1)
- Auth (register, login, refresh, logout, profile)
- Workspaces/Projects with members and roles
- Issues CRUD with status, priority, severity, labels, assignee, due date
- Kanban board + list view + filters + search
- Comments and activity timeline
- AI: triage assistant, duplicate detection, issue summary
- Dashboard with charts
- Dark/light theme, responsive, accessible

## 6. Out of Scope for v1 (Stretch)
Real-time collaboration (WebSockets), GitHub issue sync, Slack integration, billing (Stripe), SSO, mobile app, file attachments to S3.

## 7. Success Criteria (Resume Value)
- Live deployed product URL
- README with product screenshots, architecture diagram, and technical decisions
- Lighthouse score 90+ (Performance, A11y, Best Practices)
- 80%+ backend test coverage on core apps
- Clean, step-by-step commit history: one separate verified conventional commit per completed step, plus a closing commit per phase (`ai-workflow-rules.md` section 4)

## 8. Document Map
| File | Purpose |
|---|---|
| `architecture-context.md` | System design, data model, API |
| `ai-workflow-rules.md` | How the AI coding agent must work |
| `code-standards.md` | Conventions for Python and TypeScript |
| `ui-context.md` | Design system and UX principles |
| `progress-tracker.md` | Living checklist and session log |
| `feature-specs/` | One spec per feature |
