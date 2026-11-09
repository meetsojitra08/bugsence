# AI Workflow Rules (for Antigravity / any AI coding agent)

These rules are mandatory. Read them at the start of every session.

## 1. Session Start Checklist
1. Read `project-overview.md`, `architecture-context.md`, `code-standards.md`, `ui-context.md`.
2. Read `progress-tracker.md` to find the current phase and next unchecked task.
3. Read the relevant file in `feature-specs/` for the task.
4. State your plan in 3-7 bullets, including the **planned commit sequence** (step commits and the phase-closing commit).

## 2. Working Rules
- **One task at a time.** Finish, test, verify, commit (section 4), then update the tracker. Do not start the next feature unasked.
- **Spec is truth.** If code and spec conflict, stop and ask. Never silently change the data model or API contract; update the docs in the same change.
- **Small diffs.** Prefer many small, reviewable commits over one giant change.
- **No invented dependencies.** Use the stack in `project-overview.md`. If a new package is needed, justify it in one line and add it to the tracker's decision log.
- **Never hardcode secrets.** Use env vars and keep `.env.example` current.
- **No placeholder code** (`TODO: implement`, fake data in production paths) unless flagged in the tracker.
- **Ask when ambiguous**, with a recommended default, rather than guessing on anything affecting schema, auth, or UX flow.

## 3. Definition of Done
A task is done only when:
- [ ] Feature works end to end (backend + frontend if applicable)
- [ ] Tests written and passing (pytest / Vitest)
- [ ] Lint and type checks pass (`ruff`, `mypy` optional, `eslint`, `tsc --noEmit`)
- [ ] Loading, empty, and error states implemented in the UI
- [ ] Responsive (mobile 375px, tablet, desktop) and keyboard accessible
- [ ] Postman collection updated for new endpoints
- [ ] `progress-tracker.md` updated
- [ ] **Separate conventional commit created after verification (see section 4)**
- [ ] Commit hash logged in `progress-tracker.md`

## 4. Git Workflow and Commit Protocol (MANDATORY)

### 4.1 The Rule
After completing **each step or phase**, create a **separate, clear Git commit** with a descriptive conventional commit message. Commit **only after** that step or phase is complete **and verified**. Never batch several unrelated steps into one commit, and never commit half-finished or broken work.

### 4.2 Verify Before Every Commit
Run and confirm all of these pass first:
- [ ] Backend: `ruff check .`, `pytest` (for touched apps), `python manage.py makemigrations --check`
- [ ] Frontend: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` (when frontend changed)
- [ ] The feature was manually checked (endpoint via Postman/curl, UI in browser, light and dark)
- [ ] `git status` shows only files related to this step (no `.env`, secrets, build output, stray files)
- [ ] `progress-tracker.md` updated (tick the item, add the commit to the Commit Log)

### 4.3 Commit Granularity
| Level | When to commit | Example |
|---|---|---|
| **Step commit** | One verified, self-contained unit of work (a model + migration, one endpoint set, one UI component/screen) | `feat(issues): add Issue model and migrations` |
| **Phase commit** | Final commit when every task in a phase is done and verified (tracker checkboxes all ticked) | `docs(tracker): complete phase 3 issues core` |

A typical feature is several step commits, in this order: models/migrations, services and API, tests, frontend API layer and hooks, UI, docs/tracker.

### 4.4 Conventional Commit Format
```
<type>(<scope>): <imperative summary, max 72 chars>

<optional body: what and why, not how>
<optional footer: BREAKING CHANGE, Refs: feature-specs/03-issues-core.md>
```
Types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `perf`, `build`, `ci`.
Scopes: `auth`, `projects`, `issues`, `board`, `comments`, `ai`, `analytics`, `notifications`, `ui`, `landing`, `deploy`, `deps`, `tracker`.

Good examples:
- `chore(setup): scaffold Django project with split settings`
- `feat(auth): add JWT login, refresh and logout endpoints`
- `test(auth): cover token rotation and blacklist`
- `feat(ui): build login page with animated gradient panel`
- `style(board): refine card spacing and drag shadow`
- `refactor(issues): extract move logic into service layer`
- `fix(board): prevent position collision after rebalance`
- `docs: update progress tracker after phase 1`

Bad examples (never do): `update`, `fix stuff`, `wip`, `changes`, `final`, `asdf`.

### 4.5 Commit Rules
- One logical change per commit; subject in imperative mood ("add", not "added"); no trailing period.
- Never use `git add .` blindly. Stage deliberately (`git add -p` or named paths) and review `git diff --staged`.
- Never commit `.env`, API keys, `node_modules`, `__pycache__`, `db.sqlite3`, `dist/`, or logs.
- Never use `--no-verify` to skip hooks, and never amend or force-push shared history without asking.
- If verification fails, fix first; commit only when green. Use a separate `fix:` commit only for bugs found *after* a commit landed.
- Do not commit commented-out code or debug statements.

### 4.6 Branching
- Branch per feature: `feat/<spec-number>-<slug>`, `fix/<slug>`, `chore/<slug>`; merge to `main` through a PR after the phase is verified (squash is not used, to preserve the step history).
- PR description: summary, screenshots/GIF for UI, test notes, linked spec.

### 4.7 Agent Behavior at Commit Time
After each verified step the agent must:
1. Show a short summary of what changed and the verification results.
2. Show the proposed `git add` paths and the commit message.
3. Create the commit (if the user has allowed auto-commit) or present the exact commands to run.
4. Record the commit hash and message in `progress-tracker.md` under the Commit Log.
5. Pause or continue to the next step per the user's instruction.

## 5. Testing Rules
- Backend: pytest + pytest-django + factory_boy. Test permissions explicitly (each role).
- Mock Groq in tests. Never call the live API in CI.
- Frontend: Vitest + React Testing Library for logic and critical components; Playwright for 2-3 smoke flows (login, create issue, move card).

## 6. AI Feature Rules (Groq)
- All calls through the single service wrapper; no direct SDK calls in views.
- Validate every model response with a Pydantic schema; never trust raw output.
- Always show AI output as a **suggestion** the user can edit or reject. Never auto-apply silently.
- Show clear AI states: loading shimmer, success, error with retry, "AI unavailable" fallback.
- Log usage in `AIRequestLog`. Respect throttling.

## 7. UI Rules
- Follow `ui-context.md` strictly. Use design tokens, never raw hex values in components.
- Use shadcn/ui primitives before building custom components.
- Every interactive element needs hover, focus-visible, active, and disabled states.
- Add motion with purpose (150-250ms, ease-out). Respect `prefers-reduced-motion`.

## 8. Communication Format
After each task, report:
1. What changed (files)
2. How to run or verify it (and verification results)
3. What is next in the tracker
4. The commit message and hash created for this step
5. Any risks or decisions needed

## 9. Things the Agent Must Never Do
- Delete or rewrite large areas of existing code without asking.
- Disable tests or lint rules to make things pass.
- Skip permission checks "for now".
- Commit API keys or paste them into code or docs.
- Commit unverified or failing code, or combine unrelated steps in one commit.
- Generate generic, template-looking UI. Aim for premium polish.

## 10. Reusable Prompt Templates
**Start a feature:** "Read the docs listed in ai-workflow-rules.md section 1. We are working on `feature-specs/XX-name.md`. Give me the plan and commit sequence first, then implement backend, then frontend, then tests. After each verified step, make a separate conventional commit and log it in the tracker."
**Commit a step:** "Verify this step per section 4.2, show `git diff --staged` summary, then commit with a conventional message and log the hash in progress-tracker.md."
**Review pass:** "Review the last changes against code-standards.md and ui-context.md. List violations and fix them."
**Polish pass:** "Audit this screen for spacing, typography, empty/loading/error states, a11y, and motion. Fix everything below the premium bar."
