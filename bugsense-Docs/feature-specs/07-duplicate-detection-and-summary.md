# 07 Duplicate Detection and AI Summary

## Goal
Prevent duplicate issues and make long threads digestible.

## Duplicate Detection
- On issue create/update (title+description), generate an embedding via Gemini embedding model; store in `Issue.embedding` (vector 768). Run async if a task queue exists, else synchronously with fallback.
- `POST /ai/duplicates` body `{project_id, title, description}` returns top 5 similar open/closed issues with cosine similarity score; threshold default 0.80 (configurable).
- Use pgvector cosine distance with HNSW index; scope to the same project.
- Fallback when embeddings unavailable: Postgres trigram similarity on title.

### Frontend
- As the user types in the create modal (debounced 800ms, min 20 chars), show a non-blocking banner: "3 similar issues found" with expandable list (key, title, status, similarity %).
- Actions: "View", "Mark as duplicate of this" (sets `duplicate_of`, closes issue), "Create anyway".

## AI Summary
- `POST /issues/{id}/ai/summarize` summarizes description + comments + activity into: TL;DR (2 sentences), current status, open questions, suggested next step.
- Cache in `ai_summary` with `summary_generated_at`; regenerate button; auto-stale when new comments arrive.
- UI: AI summary card at top of issue detail with sparkle styling, collapse/expand.

## Acceptance Criteria
- Similar results appear in < 1.5s. No duplicates across projects leak (scope check).
- Summary never exposes data from other projects.

## Tests
Similarity ordering, threshold, project scoping, fallback path, summary caching and invalidation.

## Commit Plan
Separate verified conventional commits per step (see `ai-workflow-rules.md` section 4): backend models/API, tests, frontend hooks, UI, tracker update. Commit only after each step passes lint, tests and manual verification.
