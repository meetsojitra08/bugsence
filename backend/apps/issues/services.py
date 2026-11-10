import logging
import re
import uuid
from datetime import date, timedelta
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.issues.models import (
    Activity,
    Comment,
    Issue,
    IssuePriority,
    IssueSeverity,
    IssueSource,
    IssueStatus,
    IssueType,
    Label,
    PullRequestLink,
)
from apps.issues.notifications_dispatch import (
    notify_inbox_arrival,
    notify_issue_resolved,
    send_email_safely,
    send_slack_message_safely,
    user_wants_channel,
)
from apps.notifications.models import Notification, NotificationKind
from apps.projects.models import Membership, Project

logger = logging.getLogger(__name__)

User = get_user_model()


def allocate_next_issue_number(project: Project) -> int:
    """
    Atomically allocates the next sequential issue number for a project.
    Locks the Project row with select_for_update to guarantee zero collisions
    even under intense concurrent creation requests.
    """
    Project.objects.select_for_update().get(id=project.id)
    last_issue = Issue.all_objects.filter(project=project).order_by("-number").first()
    return (last_issue.number + 1) if last_issue else 1


def log_activity(
    *,
    project: Project,
    issue: Issue | None = None,
    actor: User | None = None,
    verb: str,
    field: str = "",
    old_value: str = "",
    new_value: str = "",
) -> Activity:
    """Records an activity log entry."""
    return Activity.objects.create(
        project=project,
        issue=issue,
        actor=actor,
        verb=verb,
        field=field,
        old_value=str(old_value) if old_value is not None else "",
        new_value=str(new_value) if new_value is not None else "",
    )


def create_issue(
    *,
    project: Project,
    reporter: User,
    title: str,
    description: str = "",
    steps_to_reproduce: str = "",
    expected: str = "",
    actual: str = "",
    environment: str = "",
    status: str = IssueStatus.TODO,
    priority: str = IssuePriority.MEDIUM,
    severity: str = IssueSeverity.MINOR,
    type: str = IssueType.BUG,
    source: str = IssueSource.MANUAL,
    assignee: User | None = None,
    labels: list[Label] | None = None,
    due_date: date | None = None,
    position: float | None = None,
    external_reporter_name: str = "",
    external_reporter_email: str = "",
    external_ref: str = "",
    is_blocking_release: bool = False,
    duplicate_of: Issue | None = None,
    parent: Issue | None = None,
    checklist: list[dict] | None = None,
    ai_metadata: dict[str, Any] | None = None,
) -> Issue:
    """
    Creates a new issue in the project inside an atomic transaction.
    Allocates issue number, computes initial board position, attaches labels,
    and records an activity log entry.
    """
    cleaned_title = title.strip()
    cleaned_desc = description.strip()

    meta = dict(ai_metadata or {})
    if status == IssueStatus.INBOX:
        if "possible_duplicates" not in meta:
            from apps.ai.services.duplicates import find_duplicate_issues

            dups = find_duplicate_issues(
                project=project,
                title=cleaned_title,
                description=cleaned_desc,
                threshold=0.55,
                limit=3,
                user=reporter,
            )
            if dups:
                meta["possible_duplicates"] = dups
        if "suggested_assignee" not in meta:
            from apps.ai.services.fallback import suggest_assignee_for_report

            suggested = suggest_assignee_for_report(
                project=project,
                raw_text=cleaned_desc,
                title=cleaned_title,
            )
            if suggested:
                meta["suggested_assignee"] = suggested

    normalized_checklist = []
    for item in checklist or []:
        if isinstance(item, dict) and item.get("text"):
            normalized_checklist.append(
                {
                    "id": str(item.get("id") or uuid.uuid4()),
                    "text": str(item["text"]).strip(),
                    "done": bool(item.get("done", False)),
                    "sub_issue_id": item.get("sub_issue_id"),
                    "sub_issue_key": item.get("sub_issue_key"),
                }
            )

    with transaction.atomic():
        number = allocate_next_issue_number(project)

        # Board position: place at end of status column if not explicitly provided
        if position is None:
            last_in_column = (
                Issue.objects.filter(project=project, status=status)
                .order_by("-position")
                .values_list("position", flat=True)
                .first()
            )
            position = (last_in_column + 65536.0) if last_in_column is not None else 65536.0

        issue = Issue.objects.create(
            project=project,
            number=number,
            title=cleaned_title,
            description=cleaned_desc,
            steps_to_reproduce=steps_to_reproduce.strip(),
            expected=expected.strip(),
            actual=actual.strip(),
            environment=environment.strip(),
            status=status,
            priority=priority,
            severity=severity,
            type=type,
            source=source,
            reporter=reporter,
            assignee=assignee,
            due_date=due_date,
            position=position,
            external_reporter_name=external_reporter_name.strip(),
            external_reporter_email=external_reporter_email.strip().lower(),
            external_ref=external_ref.strip(),
            is_blocking_release=is_blocking_release,
            duplicate_of=duplicate_of,
            parent=parent,
            checklist=normalized_checklist,
            ai_metadata=meta,
        )

        if labels:
            issue.labels.set(labels)

        if source != IssueSource.MANUAL:
            sender_label = (
                external_reporter_name.strip() or external_reporter_email.strip() or source
            )
            log_activity(
                project=project,
                issue=issue,
                actor=None,
                verb="received",
                field=source,
                new_value=sender_label,
            )
        else:
            log_activity(
                project=project,
                issue=issue,
                actor=reporter,
                verb="created",
                new_value=issue.title,
            )

        if status == IssueStatus.INBOX:
            notify_inbox_arrival(
                issue=issue,
                actor=reporter if source == IssueSource.MANUAL else None,
            )

        if assignee and assignee != reporter:
            actor_name = reporter.full_name or reporter.email
            if user_wants_channel(assignee, "assigned", "in_app"):
                Notification.objects.create(
                    recipient=assignee,
                    actor=reporter,
                    issue=issue,
                    kind=NotificationKind.ASSIGNED,
                    title=f"{actor_name} assigned you to {issue.key}",
                    message=issue.title,
                )
            if user_wants_channel(assignee, "assigned", "email"):
                send_email_safely(
                    to_email=assignee.email,
                    subject=f"[{project.key}] Assigned to you: {issue.key}",
                    body=f"{actor_name} assigned you to {issue.key}: {issue.title}",
                )
            send_slack_message_safely(
                project=project,
                event_key="assigned",
                text=(
                    f":bust_in_silhouette: *[{issue.key}]* {issue.title} "
                    f"assigned to {assignee.display_name}"
                ),
            )

    return issue


def update_issue(
    *,
    issue: Issue,
    actor: User,
    **kwargs: Any,
) -> Issue:
    """
    Updates mutable issue fields and generates granular activity log entries
    for every modified attribute (status changes, re-assignments, priority shifts).
    """
    allowed_fields = [
        "title",
        "description",
        "steps_to_reproduce",
        "expected",
        "actual",
        "environment",
        "status",
        "priority",
        "severity",
        "type",
        "assignee",
        "due_date",
        "position",
        "external_reporter_name",
        "external_reporter_email",
        "is_blocking_release",
        "duplicate_of",
        "parent",
        "checklist",
        "resolution_note",
        "snoozed_until",
    ]

    update_fields = ["updated_at"]
    activities_to_create = []
    old_assignee = issue.assignee
    old_status = issue.status

    with transaction.atomic():
        for field_name in allowed_fields:
            if field_name in kwargs:
                old_val = getattr(issue, field_name)
                new_val = kwargs[field_name]

                # Normalize strings
                if isinstance(old_val, str) and isinstance(new_val, str):
                    new_val = new_val.strip()

                if old_val != new_val:
                    setattr(issue, field_name, new_val)
                    update_fields.append(field_name)

                    # Determine specific activity verb
                    if field_name == "status":
                        verb = "status_changed"
                    elif field_name == "priority":
                        verb = "priority_changed"
                    elif field_name == "assignee":
                        verb = "assigned" if new_val else "unassigned"
                    else:
                        verb = "updated"

                    old_str = old_val.email if hasattr(old_val, "email") else str(old_val or "")
                    new_str = new_val.email if hasattr(new_val, "email") else str(new_val or "")

                    activities_to_create.append(
                        Activity(
                            project=issue.project,
                            issue=issue,
                            actor=actor,
                            verb=verb,
                            field=field_name,
                            old_value=old_str,
                            new_value=new_str,
                        )
                    )

        if "labels" in kwargs:
            new_labels = kwargs["labels"]
            issue.labels.set(new_labels)
            activities_to_create.append(
                Activity(
                    project=issue.project,
                    issue=issue,
                    actor=actor,
                    verb="updated",
                    field="labels",
                    new_value=", ".join(lbl.name for lbl in new_labels),
                )
            )

        if len(update_fields) > 1:
            if "status" in kwargs and issue.status in (IssueStatus.DONE, IssueStatus.CLOSED):
                if issue.resolved_at is None:
                    issue.resolved_at = timezone.now()
                    update_fields.append("resolved_at")
            issue.save(update_fields=update_fields)

        if activities_to_create:
            Activity.objects.bulk_create(activities_to_create)

        # Notification Triggers: Assigned & Status Changed
        actor_name = actor.full_name or actor.email
        notifs_to_create: list[Notification] = []

        if (
            "assignee" in kwargs
            and issue.assignee
            and issue.assignee != old_assignee
            and issue.assignee != actor
        ):
            if user_wants_channel(issue.assignee, "assigned", "in_app"):
                notifs_to_create.append(
                    Notification(
                        recipient=issue.assignee,
                        actor=actor,
                        issue=issue,
                        kind=NotificationKind.ASSIGNED,
                        title=f"{actor_name} assigned you to {issue.key}",
                        message=issue.title,
                    )
                )
            if user_wants_channel(issue.assignee, "assigned", "email"):
                send_email_safely(
                    to_email=issue.assignee.email,
                    subject=f"[{issue.project.key}] Assigned to you: {issue.key}",
                    body=f"{actor_name} assigned you to {issue.key}: {issue.title}",
                )
            send_slack_message_safely(
                project=issue.project,
                event_key="assigned",
                text=(
                    f":bust_in_silhouette: *[{issue.key}]* {issue.title} "
                    f"assigned to {issue.assignee.display_name}"
                ),
            )

        if "status" in kwargs and issue.status != old_status:
            recipients = set()
            if issue.reporter_id != actor.id:
                recipients.add(issue.reporter)
            if issue.assignee and issue.assignee_id != actor.id:
                recipients.add(issue.assignee)

            for r in recipients:
                msg = f"{actor_name} moved {issue.key} from {old_status} to {issue.status}."
                notifs_to_create.append(
                    Notification(
                        recipient=r,
                        actor=actor,
                        issue=issue,
                        kind=NotificationKind.STATUS_CHANGED,
                        title=f"Status changed to {issue.status} on {issue.key}",
                        message=msg,
                    )
                )

        if notifs_to_create:
            Notification.objects.bulk_create(notifs_to_create)

    return issue


def delete_issue(
    *,
    issue: Issue,
    actor: User,
    soft_delete: bool = True,
) -> None:
    """
    Deletes or soft-deletes an issue. Soft-deleted issues can be restored.
    """
    with transaction.atomic():
        if soft_delete:
            issue.deleted_at = timezone.now()
            issue.save(update_fields=["deleted_at", "updated_at"])
            log_activity(
                project=issue.project,
                issue=issue,
                actor=actor,
                verb="deleted",
            )
        else:
            issue.delete()


def restore_issue(
    *,
    issue_id: UUID,
    actor: User,
) -> Issue:
    """
    Restores a soft-deleted issue, supporting undo operations.
    """
    with transaction.atomic():
        issue = Issue.all_objects.filter(id=issue_id).first()
        if not issue:
            raise ValidationError({"detail": "Issue not found."})

        issue.deleted_at = None
        issue.save(update_fields=["deleted_at", "updated_at"])

        log_activity(
            project=issue.project,
            issue=issue,
            actor=actor,
            verb="restored",
        )

    return issue


def create_label(
    *,
    project: Project,
    name: str,
    color: str = "#6366F1",
    description: str = "",
) -> Label:
    """
    Creates a new label for a project. Validates hex color.
    """
    cleaned_name = name.strip()
    cleaned_color = color.strip()

    if not re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", cleaned_color):
        raise ValidationError({"color": "Invalid hex color format (e.g. #6366F1 or #FFF)."})

    if Label.objects.filter(project=project, name__iexact=cleaned_name).exists():
        raise ValidationError({"name": "A label with this name already exists in this project."})

    return Label.objects.create(
        project=project,
        name=cleaned_name,
        color=cleaned_color,
        description=description.strip(),
    )


POSITION_GAP_THRESHOLD = 1e-6
POSITION_DEFAULT_STEP = 65536.0


def rebalance_positions(*, project: Project, status: str) -> None:
    """
    Rebalances the position values for all active issues in a column
    to restore clean 65536.0 float spacing whenever gaps fall below 1e-6.
    """
    issues = list(
        Issue.objects.filter(project=project, status=status).order_by("position", "created_at")
    )
    for index, issue in enumerate(issues):
        issue.position = (index + 1) * POSITION_DEFAULT_STEP
    Issue.objects.bulk_update(issues, ["position"])


def move_issue(
    *,
    issue: Issue,
    actor: User,
    status: str,
    before_id: UUID | None = None,
    after_id: UUID | None = None,
) -> Issue:
    """
    Moves an issue to a new status column and/or updates its board position.
    Calculates position as the midpoint between neighbors.
    Rebalances column positions when the gap falls below 1e-6.
    Writes a status_changed activity entry if status transitioned.
    """
    with transaction.atomic():
        if status not in [choice[0] for choice in IssueStatus.choices]:
            raise ValidationError({"status": f"Invalid status: {status}"})

        before_issue = None
        after_issue = None

        if before_id:
            before_issue = Issue.objects.filter(
                id=before_id,
                project=issue.project,
            ).first()
            if not before_issue:
                raise ValidationError({"before_id": "Before issue not found in this project."})

        if after_id:
            after_issue = Issue.objects.filter(
                id=after_id,
                project=issue.project,
            ).first()
            if not after_issue:
                raise ValidationError({"after_id": "After issue not found in this project."})

        # Calculate new position
        if before_issue and after_issue:
            gap = abs(after_issue.position - before_issue.position)
            if gap < POSITION_GAP_THRESHOLD:
                rebalance_positions(project=issue.project, status=status)
                before_issue.refresh_from_db(fields=["position"])
                after_issue.refresh_from_db(fields=["position"])
            new_position = (before_issue.position + after_issue.position) / 2.0
        elif before_issue:
            # Placed after before_issue (towards bottom)
            new_position = before_issue.position + POSITION_DEFAULT_STEP
        elif after_issue:
            # Placed before after_issue (at top of column)
            if after_issue.position < (POSITION_GAP_THRESHOLD * 2):
                rebalance_positions(project=issue.project, status=status)
                after_issue.refresh_from_db(fields=["position"])
            new_position = after_issue.position / 2.0
            if new_position < POSITION_GAP_THRESHOLD:
                rebalance_positions(project=issue.project, status=status)
                after_issue.refresh_from_db(fields=["position"])
                new_position = after_issue.position / 2.0
        else:
            # Placed in empty column
            last_in_column = (
                Issue.objects.filter(project=issue.project, status=status)
                .exclude(id=issue.id)
                .order_by("-position")
                .first()
            )
            new_position = (
                (last_in_column.position + POSITION_DEFAULT_STEP)
                if last_in_column
                else POSITION_DEFAULT_STEP
            )

        old_status = issue.status
        status_changed = old_status != status

        issue.status = status
        issue.position = new_position
        issue.save(update_fields=["status", "position", "updated_at"])

        if status_changed:
            log_activity(
                project=issue.project,
                issue=issue,
                actor=actor,
                verb="status_changed",
                field="status",
                old_value=old_status,
                new_value=status,
            )

            actor_name = actor.full_name or actor.email
            recipients = set()
            if issue.reporter_id != actor.id:
                recipients.add(issue.reporter)
            if issue.assignee and issue.assignee_id != actor.id:
                recipients.add(issue.assignee)

            move_notifs = [
                Notification(
                    recipient=r,
                    actor=actor,
                    issue=issue,
                    kind=NotificationKind.STATUS_CHANGED,
                    title=f"Status changed to {status} on {issue.key}",
                    message=f"{actor_name} moved {issue.key} from {old_status} to {status}.",
                )
                for r in recipients
            ]
            if move_notifs:
                Notification.objects.bulk_create(move_notifs)

    return issue


MENTION_REGEX = re.compile(r"@([a-zA-Z0-9_.+-]+)")


def extract_mention_tokens(text: str) -> list[str]:
    """Extracts raw mention tokens from text (e.g. ['priya', 'alex@example.com'])."""
    matches = MENTION_REGEX.findall(text)
    tokens: list[str] = []
    for match in matches:
        cleaned = match.rstrip(".,;:!?")
        if cleaned and cleaned not in tokens:
            tokens.append(cleaned)
    return tokens


def notify_mentioned_users(
    *,
    comment: Comment,
    actor: User,
) -> list[Notification]:
    """
    Parses mentions from comment body and creates Notification records
    for project members matched by email prefix, full email, or UUID.
    Never notifies the actor/author.
    """
    tokens = extract_mention_tokens(comment.body)
    if not tokens:
        return []

    project = comment.issue.project
    project_members = list(Membership.objects.filter(project=project).select_related("user"))

    already_notified = set(
        Notification.objects.filter(comment=comment).values_list("recipient_id", flat=True)
    )
    already_notified.add(actor.id)

    notifications_to_create: list[Notification] = []

    for member in project_members:
        u = member.user
        if u.id in already_notified:
            continue

        email_prefix = u.email.split("@")[0].lower()
        full_email = u.email.lower()
        uuid_str = str(u.id).lower()
        full_name_clean = u.full_name.lower().replace(" ", "") if u.full_name else ""

        matched = False
        for token in tokens:
            t = token.lower()
            if (
                t == email_prefix
                or t == full_email
                or t == uuid_str
                or (full_name_clean and t == full_name_clean)
            ):
                matched = True
                break

        if matched:
            actor_name = actor.full_name or actor.email
            notifications_to_create.append(
                Notification(
                    recipient=u,
                    actor=actor,
                    issue=comment.issue,
                    comment=comment,
                    kind=NotificationKind.MENTION,
                    title=f"{actor_name} mentioned you on {comment.issue.key}",
                    message=comment.body[:300],
                )
            )
            already_notified.add(u.id)

    if notifications_to_create:
        Notification.objects.bulk_create(notifications_to_create)

    return notifications_to_create


def create_comment(
    *,
    issue: Issue,
    author: User,
    body: str,
) -> Comment:
    """
    Creates a new comment on an issue, writes an activity log entry,
    and dispatches notifications to any mentioned project members.
    """
    cleaned_body = body.strip()
    if not cleaned_body:
        raise ValidationError({"body": "Comment body cannot be blank."})

    with transaction.atomic():
        comment = Comment.objects.create(
            issue=issue,
            author=author,
            body=cleaned_body,
        )

        log_activity(
            project=issue.project,
            issue=issue,
            actor=author,
            verb="commented",
            field="",
            old_value="",
            new_value=cleaned_body[:100],
        )

        if issue.ai_summary:
            meta = issue.ai_metadata or {}
            meta["summary_stale"] = True
            issue.ai_metadata = meta
            issue.save(update_fields=["ai_metadata"])

        mentioned = notify_mentioned_users(comment=comment, actor=author)
        mentioned_ids = {n.recipient_id for n in mentioned}

        actor_name = author.full_name or author.email
        comment_notifs: list[Notification] = []
        for person in (issue.reporter, issue.assignee):
            if person and person.id != author.id and person.id not in mentioned_ids:
                comment_notifs.append(
                    Notification(
                        recipient=person,
                        actor=author,
                        issue=issue,
                        comment=comment,
                        kind=NotificationKind.COMMENT,
                        title=f"New comment on {issue.key} by {actor_name}",
                        message=cleaned_body[:300],
                    )
                )
                mentioned_ids.add(person.id)

        if comment_notifs:
            Notification.objects.bulk_create(comment_notifs)

    return comment


def update_comment(
    *,
    comment: Comment,
    actor: User,
    body: str,
) -> Comment:
    """
    Updates an existing comment's body, marks edited_at, and notifies
    any newly mentioned users.
    """
    cleaned_body = body.strip()
    if not cleaned_body:
        raise ValidationError({"body": "Comment body cannot be blank."})

    with transaction.atomic():
        comment.body = cleaned_body
        comment.edited_at = timezone.now()
        comment.save(update_fields=["body", "edited_at"])

        notify_mentioned_users(comment=comment, actor=actor)

    return comment


def delete_comment(
    *,
    comment: Comment,
    actor: User,
) -> None:
    """
    Deletes a comment.
    """
    comment.delete()


def triage_inbox_issue(
    *,
    issue: Issue,
    actor: User,
    action: str,
    assignee: User | None = None,
    priority: str | None = None,
    target_issue: Issue | None = None,
    snooze_hours: int = 24,
    reason: str = "",
) -> Issue:
    """Executes one-click Inbox triage actions."""
    with transaction.atomic():
        if action == "accept":
            kwargs: dict[str, Any] = {"status": IssueStatus.TODO, "snoozed_until": None}
            if assignee is not None:
                kwargs["assignee"] = assignee
            if priority:
                kwargs["priority"] = priority
            update_issue(issue=issue, actor=actor, **kwargs)

        elif action == "assign":
            if assignee is None:
                raise ValidationError({"assignee_id": "Select a team member to assign."})
            kwargs = {"status": IssueStatus.TODO, "assignee": assignee, "snoozed_until": None}
            if priority:
                kwargs["priority"] = priority
            update_issue(issue=issue, actor=actor, **kwargs)

        elif action == "merge":
            if target_issue is None or target_issue.id == issue.id:
                raise ValidationError(
                    {"target_issue_id": "Choose a different issue to merge into."}
                )
            if target_issue.project_id != issue.project_id:
                raise ValidationError(
                    {"target_issue_id": "Target issue must belong to the same project."}
                )

            issue.duplicate_of = target_issue
            issue.status = IssueStatus.CLOSED
            issue.resolution_note = f"Merged as duplicate of {target_issue.key}"
            issue.resolved_at = timezone.now()
            issue.snoozed_until = None
            issue.save(
                update_fields=[
                    "duplicate_of",
                    "status",
                    "resolution_note",
                    "resolved_at",
                    "snoozed_until",
                    "updated_at",
                ]
            )
            log_activity(
                project=issue.project,
                issue=issue,
                actor=actor,
                verb="merged",
                field="duplicate_of",
                new_value=target_issue.key,
            )
            log_activity(
                project=issue.project,
                issue=target_issue,
                actor=actor,
                verb="merged_report",
                new_value=f"{issue.key}: {issue.title}",
            )

        elif action == "snooze":
            until = timezone.now() + timedelta(hours=snooze_hours)
            issue.snoozed_until = until
            issue.save(update_fields=["snoozed_until", "updated_at"])
            log_activity(
                project=issue.project,
                issue=issue,
                actor=actor,
                verb="snoozed",
                new_value=f"{snooze_hours}h",
            )

        elif action == "reject":
            note = reason.strip() or "Won't fix"
            issue.status = IssueStatus.CLOSED
            issue.resolution_note = note
            issue.resolved_at = timezone.now()
            issue.snoozed_until = None
            issue.save(
                update_fields=[
                    "status",
                    "resolution_note",
                    "resolved_at",
                    "snoozed_until",
                    "updated_at",
                ]
            )
            log_activity(
                project=issue.project,
                issue=issue,
                actor=actor,
                verb="rejected",
                field="status",
                old_value=IssueStatus.INBOX,
                new_value=IssueStatus.CLOSED,
            )
            if issue.external_reporter_email:
                send_email_safely(
                    to_email=issue.external_reporter_email,
                    subject=f"[{issue.key}] Closed: {issue.title}",
                    body=(
                        f"Your report ({issue.key}: {issue.title}) was reviewed and closed: {note}"
                    ),
                )

    return issue


def resolve_issue(
    *,
    issue: Issue,
    actor: User,
    resolution_note: str = "",
    notify_reporter: bool = True,
) -> Issue:
    """Marks an issue Done with a 'What fixed it?' note and notifies the reporter."""
    cleaned_note = resolution_note.strip()
    old_status = issue.status
    with transaction.atomic():
        issue.status = IssueStatus.DONE
        issue.resolution_note = cleaned_note
        issue.resolved_at = timezone.now()
        issue.save(update_fields=["status", "resolution_note", "resolved_at", "updated_at"])

        log_activity(
            project=issue.project,
            issue=issue,
            actor=actor,
            verb="resolved",
            field="status",
            old_value=old_status,
            new_value=cleaned_note or IssueStatus.DONE,
        )

        if notify_reporter:
            notify_issue_resolved(issue=issue, actor=actor, resolution_note=cleaned_note)

    return issue


def convert_checklist_item_to_sub_issue(
    *,
    issue: Issue,
    item_id: str,
    actor: User,
) -> tuple[Issue, Issue]:
    """Converts a checklist item on an issue into a tracked sub-issue."""
    checklist = list(issue.checklist or [])
    target_item = next((it for it in checklist if str(it.get("id")) == str(item_id)), None)
    if not target_item:
        raise ValidationError({"item_id": "Checklist item not found."})

    if target_item.get("sub_issue_id"):
        existing = Issue.objects.filter(id=target_item["sub_issue_id"]).first()
        if existing:
            return issue, existing

    sub_issue = create_issue(
        project=issue.project,
        reporter=actor,
        title=str(target_item.get("text", "")).strip()[:255] or f"Sub-task of {issue.key}",
        status=IssueStatus.TODO,
        priority=issue.priority,
        severity=issue.severity,
        type=IssueType.TASK,
        parent=issue,
    )
    target_item["sub_issue_id"] = str(sub_issue.id)
    target_item["sub_issue_key"] = sub_issue.key
    issue.checklist = checklist
    issue.save(update_fields=["checklist", "updated_at"])
    return issue, sub_issue


def bulk_update_issues(
    *,
    project: Project,
    actor: User,
    issue_ids: list[UUID],
    action: str,
    assignee: User | None = None,
    status_val: str | None = None,
    label: Label | None = None,
) -> int:
    """Applies bulk assign, status, label, or archive actions to project issues."""
    issues = list(Issue.objects.filter(project=project, id__in=issue_ids))
    if not issues:
        return 0

    with transaction.atomic():
        for issue in issues:
            if action == "assign":
                update_issue(issue=issue, actor=actor, assignee=assignee)
            elif action == "status" and status_val:
                update_issue(issue=issue, actor=actor, status=status_val)
            elif action == "add_label" and label:
                issue.labels.add(label)
                log_activity(
                    project=project,
                    issue=issue,
                    actor=actor,
                    verb="updated",
                    field="labels",
                    new_value=label.name,
                )
            elif action == "archive":
                delete_issue(issue=issue, actor=actor, soft_delete=True)
    return len(issues)


def link_pull_request(
    *,
    issue: Issue,
    pr_number: int,
    url: str,
    title: str = "",
    branch: str = "",
    repo_full_name: str = "",
    state: str = "open",
    ci_status: str = "unknown",
    actor: User | None = None,
    auto_transition: bool = True,
) -> PullRequestLink:
    """Links or updates a GitHub PR on an issue and updates workflow status."""
    with transaction.atomic():
        pr_link, created = PullRequestLink.objects.update_or_create(
            issue=issue,
            url=url.strip(),
            defaults={
                "pr_number": pr_number,
                "title": title.strip()[:255],
                "branch": branch.strip()[:255],
                "repo_full_name": repo_full_name.strip()[:255],
                "state": state,
                "ci_status": ci_status,
            },
        )

        if created:
            log_activity(
                project=issue.project,
                issue=issue,
                actor=actor,
                verb="pr_linked",
                field="pull_request",
                new_value=f"PR #{pr_number}",
            )

        if auto_transition:
            if state == "open" and issue.status in (
                IssueStatus.INBOX,
                IssueStatus.BACKLOG,
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
            ):
                old_s = issue.status
                issue.status = IssueStatus.IN_REVIEW
                issue.save(update_fields=["status", "updated_at"])
                log_activity(
                    project=issue.project,
                    issue=issue,
                    actor=actor,
                    verb="status_changed",
                    field="status",
                    old_value=old_s,
                    new_value=IssueStatus.IN_REVIEW,
                )
                recipients = {u for u in (issue.reporter, issue.assignee) if u}
                for r in recipients:
                    if user_wants_channel(r, "pr_status", "in_app"):
                        Notification.objects.create(
                            recipient=r,
                            actor=actor,
                            issue=issue,
                            kind=NotificationKind.PR_STATUS,
                            title=f"PR #{pr_number} opened for {issue.key}",
                            message=title or url,
                        )
            elif state == "merged" and issue.status not in (IssueStatus.DONE, IssueStatus.CLOSED):
                note = issue.resolution_note or f"Fixed in PR #{pr_number}: {title or branch}"
                resolve_issue(
                    issue=issue,
                    actor=actor or issue.assignee or issue.reporter,
                    resolution_note=note,
                    notify_reporter=True,
                )

    return pr_link
