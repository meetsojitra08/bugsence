# 11 Deployment

## Targets
| Part | Service |
|---|---|
| Frontend | Vercel (or Netlify) |
| Backend | Render or Railway (Gunicorn) |
| Database | Neon or Supabase Postgres (enable `pgvector`) |

## Backend Steps
1. Settings: `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, secure cookies, HSTS.
2. Add `gunicorn`, `whitenoise`, `psycopg[binary]`, `dj-database-url` or `django-environ`.
3. `Procfile` / start command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`.
4. Release command: `python manage.py migrate && python manage.py collectstatic --noinput`.
5. Set env vars (see `architecture-context.md` section 9). Keep `GROQ_API_KEY` server-side only.
6. Health endpoint `GET /api/v1/health` for uptime checks.

## Frontend Steps
1. Set `VITE_API_BASE_URL` to the deployed API origin plus `/api/v1` at build time when the API uses a separate host (for example, `https://api.example.com/api/v1`).
2. If the variable is omitted, the frontend uses the same-origin `/api/v1` path; configure the frontend host or reverse proxy to route that path to Django.
3. Set backend `CORS_ALLOWED_ORIGINS` to the deployed frontend origin when using a separate API host.
4. Add SPA rewrite (`/* -> /index.html`).
5. Build: `npm run build`; verify preview locally.

## CI/CD
- GitHub Actions: on PR run lint + tests; on `main` merge deploy automatically via platform integrations.
- Protect `main`; require passing checks.

## Post-Deploy Checklist
- [ ] Register/login works in prod; CORS ok
- [ ] AI triage works (key set, quota ok)
- [ ] HTTPS, security headers, no secrets in repo
- [ ] Postman collection pointing to prod
- [ ] Add live URLs to README and resume

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
