import re
from datetime import date
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.issues.models import (
    Activity,
    Issue,
    IssuePriority,
    IssueSeverity,
    IssueStatus,
    IssueType,
    Label,
)
from apps.projects.models import Project

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
    assignee: User | None = None,
    labels: list[Label] | None = None,
    due_date: date | None = None,
) -> Issue:
    """
    Creates a new issue in the project inside an atomic transaction.
    Allocates issue number, computes initial board position, attaches labels,
    and records an activity log entry.
    """
    with transaction.atomic():
        number = allocate_next_issue_number(project)

        # Board position: place at end of status column
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
            title=title.strip(),
            description=description.strip(),
            steps_to_reproduce=steps_to_reproduce.strip(),
            expected=expected.strip(),
            actual=actual.strip(),
            environment=environment.strip(),
            status=status,
            priority=priority,
            severity=severity,
            type=type,
            reporter=reporter,
            assignee=assignee,
            due_date=due_date,
            position=position,
        )

        if labels:
            issue.labels.set(labels)

        log_activity(
            project=project,
            issue=issue,
            actor=reporter,
            verb="created",
            new_value=issue.title,
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
    ]

    update_fields = ["updated_at"]
    activities_to_create = []

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
            issue.save(update_fields=update_fields)

        if activities_to_create:
            Activity.objects.bulk_create(activities_to_create)

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

    return issue
