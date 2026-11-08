import logging
import math
from typing import Any

from django.db import connection

from apps.ai.models import AIRequestLog, AIRequestLogKind
from apps.ai.services.gemini import gemini_service
from apps.issues.models import Issue
from apps.projects.models import Project

logger = logging.getLogger(__name__)


def python_cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2, strict=True))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


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
    Uses pgvector cosine distance if available, with automatic fallback to trigram similarity.
    """
    clean_title = title.strip()
    query_text = f"{clean_title}\n{description.strip()}".strip()

    # Attempt to generate embedding via Gemini
    query_embedding = gemini_service.generate_embedding(query_text, user=user)

    results: list[dict[str, Any]] = []
    is_postgres = connection.vendor == "postgresql"

    # Strategy 1: Dense Vector Similarity (pgvector CosineDistance on PostgreSQL)
    if query_embedding and is_postgres:
        try:
            from pgvector.django import CosineDistance

            max_distance = 1.0 - threshold
            matched_issues = (
                Issue.objects.filter(
                    project=project,
                    embedding__isnull=False,
                )
                .annotate(distance=CosineDistance("embedding", query_embedding))
                .filter(distance__lte=max_distance)
                .order_by("distance")[:limit]
            )

            for issue in matched_issues:
                sim = max(0.0, min(1.0, 1.0 - float(issue.distance)))
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
            if results:
                return results
        except Exception as exc:
            logger.warning("pgvector cosine query failed, falling back: %s", exc)

    # Strategy 2: Python Vector Similarity (if embeddings exist in non-postgres/test)
    if query_embedding:
        candidates = Issue.objects.filter(project=project, embedding__isnull=False)
        scored: list[tuple[Issue, float]] = []
        for issue in candidates:
            # issue.embedding can be a list or numpy array
            emb_list = list(issue.embedding)
            sim = python_cosine_similarity(query_embedding, emb_list)
            if sim >= threshold:
                scored.append((issue, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        for issue, sim in scored[:limit]:
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
        if results:
            return results

    # Strategy 3: Trigram Similarity Fallback
    if is_postgres:
        try:
            from django.contrib.postgres.search import TrigramSimilarity

            matched_issues = (
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
            if results:
                return results
        except Exception as exc:
            logger.warning("Postgres trigram query failed: %s", exc)

    # Strategy 4: In-Memory Trigram Fallback (SQLite / test environment)
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

    # Record AIRequestLog for duplicate search
    try:
        AIRequestLog.objects.create(
            user=user if getattr(user, "is_authenticated", False) else None,
            kind=AIRequestLogKind.DUPLICATES,
            model="embedding-hybrid",
            tokens_in=len(query_text.split()),
            tokens_out=len(results),
            latency_ms=10,
            success=True,
        )
    except Exception as exc:
        logger.warning("Failed to record duplicate AIRequestLog: %s", exc)

    return results
