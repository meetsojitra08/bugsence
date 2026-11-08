# Architecture Context

## 1. High-Level Diagram
```
React SPA (Vite, TS, Tailwind)
    |  HTTPS + JWT (Authorization: Bearer)
    v
Django REST API  --->  PostgreSQL (+ pgvector)
    |
    +--> Gemini API (triage, summary, embeddings)
    +--> Background tasks (Django-Q2 or Celery + Redis; optional in v1)
```

## 2. Repository Layout (Monorepo)
```
bugsense/
  docs/                      # these .md files
  backend/
    manage.py
    config/                  # settings (base/dev/prod), urls, wsgi
    apps/
      users/                 # custom User, auth endpoints
      projects/              # Project, Membership
      issues/                # Issue, Label, Comment, Activity
      ai/                    # Gemini service, triage, duplicates
      analytics/             # dashboard aggregations
      notifications/
    common/                  # pagination, permissions, exceptions, mixins
    tests/
  frontend/
    src/
      app/                   # router, providers, layouts
      components/ui/         # shadcn primitives
      components/            # shared composites
      features/              # auth, projects, issues, board, ai, dashboard
      lib/                   # api client, utils, query client
      hooks/
      styles/
  .github/workflows/ci.yml
  docker-compose.yml
  README.md
```

## 3. Data Model
**User**: id (UUID), email (unique), full_name, avatar_url, is_active, created_at
**Project**: id, name, key (e.g. "BUG", unique), description, owner FK, created_at, archived
**Membership**: project FK, user FK, role (`owner|admin|member|viewer`), unique(project,user)
**Label**: project FK, name, color
**Issue**: id, project FK, number (per-project sequence), title, description (markdown),
 steps_to_reproduce, expected, actual, environment,
 status (`backlog|todo|in_progress|in_review|done|closed`),
 priority (`low|medium|high|urgent`), severity (`trivial|minor|major|critical`),
 type (`bug|feature|task|improvement`), reporter FK, assignee FK (null), labels M2M,
 due_date, position (float, for board ordering), embedding (vector 768, null),
 ai_summary (text), ai_metadata (JSON), duplicate_of FK (null), created_at, updated_at
**Comment**: issue FK, author FK, body, created_at, edited_at
**Activity**: issue FK, actor FK, verb, field, old_value, new_value, created_at
**Notification**: user FK, issue FK, kind, read_at, created_at
**AIRequestLog**: user FK, kind, model, tokens_in, tokens_out, latency_ms, success, created_at

Index: (project, status), (project, assignee), (project, priority), GIN on title for search, HNSW on embedding.

## 4. API Design (REST, prefix `/api/v1/`)
| Area | Endpoints |
|---|---|
| Auth | `POST auth/register`, `auth/login`, `auth/refresh`, `auth/logout`; `GET/PATCH users/me` |
| Projects | `GET/POST projects`, `GET/PATCH/DELETE projects/{id}`, `GET/POST projects/{id}/members`, `PATCH/DELETE members/{id}` |
| Issues | `GET/POST projects/{id}/issues`, `GET/PATCH/DELETE issues/{id}`, `POST issues/{id}/move` |
| Comments | `GET/POST issues/{id}/comments`, `PATCH/DELETE comments/{id}` |
| Activity | `GET issues/{id}/activity` |
| Labels | `GET/POST projects/{id}/labels` |
| AI | `POST ai/triage`, `POST ai/duplicates`, `POST issues/{id}/ai/summarize` |
| Analytics | `GET projects/{id}/analytics/overview`, `.../trends`, `.../workload` |
| Notifications | `GET notifications`, `POST notifications/{id}/read`, `POST notifications/read-all` |

Conventions: cursor or page-number pagination (`page_size` max 100), `?search=`, `?status=`, `?assignee=`, `?ordering=`. Error shape:
```json
{ "error": { "code": "validation_error", "message": "...", "details": { "field": ["..."] } } }
```

## 5. Authentication
- Access token 15 min, refresh token 7 days, rotation + blacklist on logout.
- Frontend: access token in memory, refresh token in httpOnly secure cookie (preferred) or localStorage as fallback for MVP.
- Axios interceptor refreshes once on 401 then retries.

## 6. Authorization Matrix
| Action | viewer | member | admin | owner |
|---|---|---|---|---|
| View issues | Y | Y | Y | Y |
| Create/edit issues, comment | N | Y | Y | Y |
| Delete issues | N | own | Y | Y |
| Manage members/labels | N | N | Y | Y |
| Delete project | N | N | N | Y |
Enforce via DRF permission classes + queryset scoping (never trust client project IDs).

## 7. AI Architecture
- All Gemini calls go through `apps/ai/services/gemini.py` (single client wrapper).
- Model name from env `GEMINI_MODEL` (default a fast Flash-class model); embedding model from `GEMINI_EMBED_MODEL`.
- Structured output: request JSON with a response schema, validate with Pydantic, retry once on invalid JSON.
- Prompts live in `apps/ai/prompts/*.py` as versioned constants.
- Rate limit per user (e.g. 20 AI calls/min) via DRF throttle; log each call to `AIRequestLog`.
- Graceful degradation: if Gemini fails or times out (8s), return 503 with `ai_unavailable`; UI must still allow manual creation.
- Never send secrets, emails or PII in prompts. Truncate descriptions to 4000 chars.

## 8. Frontend Architecture
- Routing: React Router v6 (protected routes, layout routes).
- Server state: TanStack Query (optimistic updates for board moves).
- Client state: Zustand (UI only: sidebar, theme, command palette).
- Forms: React Hook Form + Zod.
- Drag and drop: dnd-kit.
- Charts: Recharts.
- Icons: lucide-react. Toasts: sonner. Command palette: cmdk.

## 9. Environment Variables
Backend: `SECRET_KEY, DEBUG, DATABASE_URL, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, GEMINI_API_KEY, GEMINI_MODEL, GEMINI_EMBED_MODEL, JWT_ACCESS_MINUTES, JWT_REFRESH_DAYS`
Frontend: `VITE_API_BASE_URL`

## 10. Non-Functional Requirements
Performance: API p95 < 300ms (non-AI), no N+1 (use `select_related`/`prefetch_related`). Security: CORS allowlist, HTTPS only in prod, password validators, throttling on auth. Observability: structured logging, Sentry (optional). Accessibility: WCAG 2.1 AA.

## 11. Deployment
- Frontend on Vercel (env `VITE_API_BASE_URL`).
- Backend on Render/Railway with Gunicorn + WhiteNoise; run `migrate` on deploy.
- Postgres on Neon/Supabase (enable `pgvector`).
- CI: GitHub Actions runs lint, tests, build on every PR.
