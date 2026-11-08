# Code Standards

## 1. General
- Readability over cleverness. Small functions, single responsibility.
- Names are descriptive; no abbreviations except common ones (id, url, api).
- Comments explain *why*, not *what*.
- No dead code, no commented-out blocks, no `print`/`console.log` left behind.

## 2. Python / Django
- Python 3.12, formatted with **ruff format**, linted with **ruff**. Line length 100.
- Type hints on all public functions and services.
- **Thin views, fat services**: business logic in `services.py`; queries in `selectors.py`; views only orchestrate.
- Serializers: separate read and write serializers when shapes differ (`IssueListSerializer`, `IssueDetailSerializer`, `IssueWriteSerializer`).
- Use `ModelViewSet`/generic views with explicit `permission_classes` on every view.
- Always scope querysets to the user's accessible projects.
- Avoid N+1: `select_related` for FKs, `prefetch_related` for M2M.
- Use `transaction.atomic` for multi-write operations (e.g. issue number allocation, move + activity log).
- Settings split: `base.py`, `dev.py`, `prod.py`. Read env with `django-environ`.
- Migrations: never edit applied migrations; name them meaningfully.
- Tests live in `tests/<app>/test_*.py`; use factories; one assertion theme per test.

```python
# Good: service pattern
def move_issue(*, issue: Issue, actor: User, status: str, position: float) -> Issue:
    with transaction.atomic():
        old = issue.status
        issue.status, issue.position = status, position
        issue.save(update_fields=["status", "position", "updated_at"])
        log_activity(issue=issue, actor=actor, verb="status_changed", old=old, new=status)
    return issue
```

## 3. TypeScript / React
- TypeScript **strict mode**. No `any` (use `unknown` + narrowing).
- Functional components and hooks only. One component per file, PascalCase filename.
- Feature-based folders: `features/issues/{api,components,hooks,types}`.
- Data fetching only via TanStack Query hooks (`useIssues`, `useCreateIssue`). No fetch in components.
- Forms: React Hook Form + Zod schema; show inline errors.
- Avoid prop drilling beyond 2 levels: use composition or context.
- Memoize only when measured (`useMemo`/`useCallback` are not defaults).
- Keys are stable IDs, never array index for reorderable lists.
- ESLint + Prettier + `tsc --noEmit` must pass.

```tsx
// Good: query hook
export function useIssues(projectId: string, filters: IssueFilters) {
  return useQuery({
    queryKey: ["issues", projectId, filters],
    queryFn: () => issuesApi.list(projectId, filters),
    placeholderData: keepPreviousData,
  });
}
```

## 4. Tailwind
- Use design tokens (CSS variables mapped in `tailwind.config`), e.g. `bg-surface`, `text-muted`.
- Class ordering via `prettier-plugin-tailwindcss`. Merge conditional classes with `cn()` (clsx + tailwind-merge).
- Extract repeated patterns into components, not `@apply` sprawl.

## 5. API Conventions
- JSON keys: `snake_case` on the wire; convert to `camelCase` in the frontend API layer.
- Plural nouns, versioned prefix, correct status codes (201 create, 204 delete, 400 validation, 401, 403, 404, 429).
- Idempotent PATCH for partial updates.

## 6. Git and Commits
Full protocol: `ai-workflow-rules.md` section 4. Summary:
- One separate commit per completed **and verified** step; a closing commit per phase.
- Conventional format `type(scope): summary` using `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `perf`, `build`, `ci`.
- Imperative mood, under 72 chars, no trailing period, scope in parentheses.
- Never commit failing code, secrets, or unrelated changes together.

## 7. Security Checklist
- Validate all input in serializers. Never build raw SQL from user input.
- Escape/sanitize markdown on render (use `rehype-sanitize`).
- Rate limit auth and AI endpoints.
- Don't leak whether an email exists on login/reset errors.
- Keep dependencies updated; run `pip-audit` and `npm audit` in CI.

## 8. Performance Checklist
- Paginate every list endpoint. Debounce search (300ms). Virtualize long lists (>200 rows).
- Code-split routes with `React.lazy`. Optimize images. Use skeletons, not spinners.
