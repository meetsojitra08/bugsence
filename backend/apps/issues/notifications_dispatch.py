"""Notification dispatch helpers for in-app, email, and Slack channels."""

import json
import logging
import urllib.request
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.notifications.models import Notification, NotificationKind
from apps.projects.models import (
    IntegrationProvider,
    Membership,
    Project,
    ProjectIntegration,
    RoleChoices,
)

logger = logging.getLogger(__name__)


def get_or_rotate_project_triager(project: Project):
    """
    Returns the active triager for a project when triage rotation is enabled,
    advancing the rotation when the cadence window has elapsed.
    """
    if not project.triage_rotation_enabled:
        return project.current_triager

    memberships = list(
        Membership.objects.filter(project=project)
        .exclude(role=RoleChoices.VIEWER)
        .select_related("user")
        .order_by("created_at")
    )
    if not memberships:
        return None

    users = [m.user for m in memberships]
    now = timezone.now()
    window = timedelta(days=1 if project.triage_rotation_cadence == "daily" else 7)

    if project.current_triager is None or project.current_triager not in users:
        project.current_triager = users[0]
        project.triage_rotation_updated_at = now
        project.save(update_fields=["current_triager", "triage_rotation_updated_at"])
        return project.current_triager

    if project.triage_rotation_updated_at and (now - project.triage_rotation_updated_at) >= window:
        idx = users.index(project.current_triager)
        next_user = users[(idx + 1) % len(users)]
        project.current_triager = next_user
        project.triage_rotation_updated_at = now
        project.save(update_fields=["current_triager", "triage_rotation_updated_at"])

    return project.current_triager


def user_wants_channel(user: Any, event_key: str, channel: str) -> bool:
    prefs = getattr(user, "notification_preferences", None) or {}
    event_prefs = prefs.get(event_key)
    if isinstance(event_prefs, dict) and channel in event_prefs:
        return bool(event_prefs[channel])
    # Defaults: in-app on for all, email on for assigned/mention/resolved
    if channel == "in_app":
        return True
    if channel == "email":
        return event_key in ("assigned", "mention", "resolved")
    if channel == "slack":
        return event_key in ("assigned", "inbox_arrival", "resolved")
    return True


def send_email_safely(*, to_email: str, subject: str, body: str) -> None:
    if not to_email:
        return
    try:
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@bugsense.app")
        send_mail(subject, body, from_email, [to_email], fail_silently=True)
    except Exception as exc:
        logger.warning("Email notification skipped for %s: %s", to_email, exc)


def send_slack_message_safely(*, project: Project, event_key: str, text: str) -> None:
    try:
        integration = ProjectIntegration.objects.filter(
            project=project,
            provider=IntegrationProvider.SLACK,
            enabled=True,
        ).first()
        if not integration:
            return
        config = integration.config or {}
        if event_key == "assigned" and not config.get("notify_on_assign", True):
            return
        if event_key == "resolved" and not config.get("notify_on_resolve", True):
            return
        webhook_url = (config.get("webhook_url") or "").strip()
        if not webhook_url or not webhook_url.startswith(("https://", "http://")):
            return
        payload = json.dumps({"text": text}).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception as exc:
        logger.warning("Slack notification failed for project %s: %s", project.key, exc)


def notify_inbox_arrival(*, issue: Any, actor: Any = None) -> None:
    """Notifies the current triager (or project owner) when a report arrives in Inbox."""
    project = issue.project
    triager = get_or_rotate_project_triager(project)
    recipient = triager or project.owner

    if recipient and (actor is None or recipient.id != actor.id):
        if user_wants_channel(recipient, "inbox_arrival", "in_app"):
            Notification.objects.create(
                recipient=recipient,
                actor=actor,
                issue=issue,
                kind=NotificationKind.INBOX_ARRIVAL,
                title=f"New {issue.get_source_display()} report in Inbox: {issue.key}",
                message=issue.title,
            )
        if user_wants_channel(recipient, "inbox_arrival", "email"):
            send_email_safely(
                to_email=recipient.email,
                subject=f"[{project.key}] New report in Inbox: {issue.key}",
                body=(
                    f"{issue.title}\n\n"
                    f"Source: {issue.get_source_display()}\n"
                    "Review it in your BugSense Inbox."
                ),
            )

    send_slack_message_safely(
        project=project,
        event_key="inbox_arrival",
        text=f":inbox_tray: *[{issue.key}]* {issue.title} (via {issue.get_source_display()})",
    )


def notify_issue_resolved(*, issue: Any, actor: Any, resolution_note: str) -> None:
    """Notifies internal and external reporters when an issue is resolved."""
    actor_name = (actor.full_name or actor.email) if actor else "The team"
    note_text = resolution_note.strip() or "Marked as resolved."

    # 1. Notify internal reporter if different from actor
    if issue.reporter and (not actor or issue.reporter_id != actor.id):
        if user_wants_channel(issue.reporter, "resolved", "in_app"):
            Notification.objects.create(
                recipient=issue.reporter,
                actor=actor,
                issue=issue,
                kind=NotificationKind.RESOLVED,
                title=f"{issue.key} was resolved by {actor_name}",
                message=note_text[:300],
            )
        if user_wants_channel(issue.reporter, "resolved", "email"):
            send_email_safely(
                to_email=issue.reporter.email,
                subject=f"[{issue.key}] Resolved: {issue.title}",
                body=(
                    f"Hi {issue.reporter.display_name},\n\n"
                    f"{issue.key} ({issue.title}) has been resolved.\n\n"
                    f"What fixed it: {note_text}\n"
                ),
            )

    # 2. Notify external reporter via email if provided
    if issue.external_reporter_email:
        greeting = (
            f"Hi {issue.external_reporter_name}," if issue.external_reporter_name else "Hi,"
        )
        send_email_safely(
            to_email=issue.external_reporter_email,
            subject=f"[{issue.key}] Update on your bug report: {issue.title}",
            body=(
                f"{greeting}\n\n"
                f"Good news — the issue you reported ({issue.key}: {issue.title}) "
                f"has been resolved.\n\nWhat fixed it: {note_text}\n\n"
                "Thanks for reporting it!\n"
            ),
        )

    # 3. Slack notification
    send_slack_message_safely(
        project=issue.project,
        event_key="resolved",
        text=(
            f":white_check_mark: *[{issue.key}]* {issue.title} "
            f"resolved by {actor_name}: {note_text}"
        ),
    )
