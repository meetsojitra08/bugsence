"""Deterministic heuristic triage & assignee suggestion helpers."""

import re
from typing import Any

from apps.ai.schemas import AITriageResponse
from apps.issues.models import Issue, IssueStatus
from apps.projects.models import Membership, Project, RoleChoices


def suggest_assignee_for_report(
    *,
    project: Project,
    raw_text: str,
    title: str = "",
) -> dict[str, Any] | None:
    """
    Suggests a project member as an owner candidate based on explicit mentions
    in the report or current workload / project default assignee.
    Never automatically assigns; returns metadata for one-click UI confirmation.
    """
    memberships = list(
        Membership.objects.filter(project=project)
        .exclude(role=RoleChoices.VIEWER)
        .select_related("user")
    )
    if not memberships:
        return None

    combined = f"{title}\n{raw_text}".lower()

    # 1. Explicit mention of a team member's name or email prefix in the report
    for m in memberships:
        user = m.user
        prefix = user.email.split("@")[0].lower()
        name_parts = [p.lower() for p in (user.full_name or "").split() if len(p) >= 3]
        if f"@{prefix}" in combined or (
            len(prefix) >= 3 and re.search(rf"\b{re.escape(prefix)}\b", combined)
        ):
            return {
                "id": str(user.id),
                "full_name": user.full_name or user.display_name,
                "email": user.email,
                "reason": "Mentioned in report",
            }
        for part in name_parts:
            if re.search(rf"\b{re.escape(part)}\b", combined):
                return {
                    "id": str(user.id),
                    "full_name": user.full_name or user.display_name,
                    "email": user.email,
                    "reason": f"Matched '{part}' in report",
                }

    # 2. Project default assignee if set
    if project.default_assignee_id:
        default_member = next(
            (m for m in memberships if m.user_id == project.default_assignee_id),
            None,
        )
        if default_member:
            u = default_member.user
            return {
                "id": str(u.id),
                "full_name": u.full_name or u.display_name,
                "email": u.email,
                "reason": "Project default assignee",
            }

    # 3. Lightest active open workload among non-viewer members
    open_statuses = [
        IssueStatus.TODO,
        IssueStatus.IN_PROGRESS,
        IssueStatus.IN_REVIEW,
    ]
    best_member = None
    best_count = None
    for m in memberships:
        cnt = Issue.objects.filter(
            project=project,
            assignee=m.user,
            status__in=open_statuses,
        ).count()
        if best_count is None or cnt < best_count:
            best_count = cnt
            best_member = m.user

    if best_member:
        return {
            "id": str(best_member.id),
            "full_name": best_member.full_name or best_member.display_name,
            "email": best_member.email,
            "reason": "Lightest active workload",
        }
    return None


def compute_missing_info(raw_text: str, steps: list[str], actual: str) -> list[str]:
    """Identifies missing reproduction context so low-confidence reports guide the user."""
    lower = raw_text.lower()
    missing: list[str] = []

    has_env = any(
        kw in lower
        for kw in (
            "chrome",
            "firefox",
            "safari",
            "edge",
            "ios",
            "android",
            "macos",
            "windows",
            "linux",
            "node",
            "python",
            "browser",
            "version",
            "v1",
            "v2",
            "staging",
            "prod",
        )
    )
    if not has_env:
        missing.append("browser or environment")

    if not steps and "step" not in lower and "when i" not in lower and "after " not in lower:
        missing.append("steps to reproduce")

    if not actual and "error" not in lower and "exception" not in lower and "500" not in lower:
        missing.append("error message or observed behavior")

    return missing


def heuristic_triage(raw_text: str, project_labels: list[str]) -> AITriageResponse:
    """
    Deterministic fallback triage when an AI provider key is not configured.
    Extracts structured fields conservatively and sets low confidence when context is thin.
    """
    cleaned = raw_text.strip()
    lines = [ln.strip() for ln in cleaned.splitlines() if ln.strip()]
    first_line = lines[0] if lines else cleaned

    # Detect stack traces / error lines for concise human title
    error_line = next(
        (
            ln
            for ln in lines
            if any(
                tok in ln
                for tok in (
                    "Error:",
                    "Exception:",
                    "TypeError",
                    "ValueError",
                    "500",
                    "404",
                    "401",
                    "Failed",
                )
            )
        ),
        first_line,
    )
    title = re.sub(r"^(Uncaught|Error:|Traceback.*?:\s*)", "", error_line).strip()
    if len(title) > 95:
        title = title[:92].rstrip() + "..."
    if not title:
        title = "Reported issue needs review"

    lower = cleaned.lower()

    # Type classification
    issue_type = "bug"
    if any(w in lower for w in ("feature request", "would be nice", "add support", "new feature")):
        issue_type = "feature"
    elif any(w in lower for w in ("refactor", "cleanup", "improve", "faster", "optimize")):
        issue_type = "improvement"
    elif any(w in lower for w in ("chore", "upgrade", "bump", "docs", "documentation")):
        issue_type = "task"

    # Priority & severity heuristics
    has_urgent = any(
        w in lower
        for w in (
            "crash",
            "outage",
            "production down",
            "data loss",
            "security",
            "cannot login",
            "blocker",
            "500",
            "payment",
        )
    )
    has_high = any(
        w in lower
        for w in (
            "error",
            "exception",
            "broken",
            "fails",
            "timeout",
            "traceback",
            "401",
            "502",
            "503",
        )
    )
    has_low = any(
        w in lower for w in ("typo", "alignment", "minor", "cosmetic", "spacing", "nice to have")
    )

    if has_urgent:
        priority, severity = "urgent", "critical"
    elif has_high:
        priority, severity = "high", "major"
    elif has_low:
        priority, severity = "low", "trivial"
    else:
        priority, severity = "medium", "minor"

    # Extract numbered steps if present
    steps = [re.sub(r"^\d+[.)]\s*", "", ln) for ln in lines if re.match(r"^\d+[.)]\s+", ln)][:6]

    # Match labels from project
    suggested_labels = [
        lbl
        for lbl in project_labels
        if lbl.lower() in lower
        or (
            lbl.lower() == "frontend"
            and any(w in lower for w in ("react", "ui", "css", "browser", "click", "render"))
        )
        or (
            lbl.lower() == "backend"
            and any(
                w in lower for w in ("api", "sql", "django", "server", "500", "database", "timeout")
            )
        )
        or (
            lbl.lower() == "security"
            and any(w in lower for w in ("auth", "token", "jwt", "xss", "csrf", "permission"))
        )
    ][:3]

    actual_behavior = (
        error_line
        if any(tok in error_line for tok in ("Error", "Exception", "500", "fail", "crash"))
        else ""
    )
    missing = compute_missing_info(cleaned, steps, actual_behavior)

    # Confidence scoring
    word_count = len(cleaned.split())
    confidence = 0.45
    if word_count >= 12:
        confidence += 0.15
    if actual_behavior:
        confidence += 0.15
    if steps or len(lines) >= 3:
        confidence += 0.12
    if not missing:
        confidence += 0.1
    confidence = round(min(0.92, max(0.32, confidence)), 2)

    reasoning = (
        f"Missing {', '.join(missing[:2])}."
        if confidence < 0.6 and missing
        else "Classified from error patterns and report context."
    )

    return AITriageResponse(
        title=title[:100],
        type=issue_type,  # type: ignore[arg-type]
        priority=priority,  # type: ignore[arg-type]
        severity=severity,  # type: ignore[arg-type]
        steps_to_reproduce=steps,
        expected_behavior="",
        actual_behavior=actual_behavior,
        suggested_labels=suggested_labels,
        possible_root_cause="",
        confidence=confidence,
        reasoning=reasoning[:200],
        missing_info=missing,
    )
