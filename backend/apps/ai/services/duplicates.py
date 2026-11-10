import logging
from typing import Any

from django.db import connection, transaction

from apps.ai.models import AIRequestLog, AIRequestLogKind
from apps.issues.models import Issue
from apps.projects.models import Project

logger = logging.getLogger(__name__)


def python_trigram_similarity(s1: str, s2: str) -> float:
    """Calculates character 3-gram Jaccard similarity as fallback."""
    s1_norm = " " + s1.lower().strip() + " "
    s2_norm = " " + s2.lower().strip() + " "
    tri1 = {s1_norm[i : i + 3] for i in range(len(s1_norm) - 2)}
    tri2 = {s2_norm[i : i + 3] for i in range(len(s2_norm) - 2)}
    if not tri1 or not tri2:
        return 1.0 if s1_norm.strip() == s2_norm.strip() else 0.0
    intersection = len(tri1 & tri2)
    union = len(tri1 | tri2)
    return intersection / union if union > 0 else 0.0


def find_duplicate_issues(
    *,
    project: Project,
    title: str,
    description: str = "",
    threshold: float = 0.80,
    limit: int = 5,
    user: Any = None,
) -> list[dict[str, Any]]:
    """
    Finds potential duplicate issues within the same project.
    Strictly scoped to project.
    Uses PostgreSQL trigram similarity (inside a savepoint), with an in-memory trigram fallback.
    """
    clean_title = title.strip()
    query_text = f"{clean_title}\n{description.strip()}".strip()
    results: list[dict[str, Any]] = []
    is_postgres = connection.vendor == "postgresql"
    pg_succeeded = False

    # Strategy 1: PostgreSQL trigram similarity (savepoint-guarded so a missing pg_trgm
    # extension never poisons an enclosing transaction.atomic() block).
    if is_postgres:
        try:
            from django.contrib.postgres.search import TrigramSimilarity

            with transaction.atomic():
                matched_issues = list(
                    Issue.objects.filter(project=project)
                    .annotate(similarity=TrigramSimilarity("title", clean_title))
                    .filter(similarity__gte=threshold)
                    .order_by("-similarity")[:limit]
                )
            for issue in matched_issues:
                results.append(
                    {
                        "id": str(issue.id),
                        "number": issue.number,
                        "key": issue.key,
                        "title": issue.title,
                        "status": issue.status,
                        "similarity": round(float(issue.similarity), 2),
                    }
                )
            pg_succeeded = True
        except Exception as exc:
            logger.warning("Postgres trigram query failed, falling back to in-memory: %s", exc)

    # Strategy 2: In-memory trigram fallback (SQLite or Postgres without pg_trgm)
    if not pg_succeeded:
        candidates = Issue.objects.filter(project=project)
        scored_tri: list[tuple[Issue, float]] = []
        for issue in candidates:
            sim = python_trigram_similarity(clean_title, issue.title)
            if sim >= threshold:
                scored_tri.append((issue, sim))

        scored_tri.sort(key=lambda x: x[1], reverse=True)
        for issue, sim in scored_tri[:limit]:
            results.append(
                {
                    "id": str(issue.id),
                    "number": issue.number,
                    "key": issue.key,
                    "title": issue.title,
                    "status": issue.status,
                    "similarity": round(sim, 2),
                }
            )

    # Record AIRequestLog for duplicate search inside its own savepoint
    try:
        with transaction.atomic():
            AIRequestLog.objects.create(
                user=user if getattr(user, "is_authenticated", False) else None,
                kind=AIRequestLogKind.DUPLICATES,
                model="trigram-similarity",
                tokens_in=len(query_text.split()),
                tokens_out=len(results),
                latency_ms=10,
                success=True,
            )
    except Exception as exc:
        logger.warning("Failed to record duplicate AIRequestLog: %s", exc)

    return results
