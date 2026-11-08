from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from apps.issues.models import Activity, Issue, IssueStatus, Label
from apps.projects.selectors import get_project_for_user

User = get_user_model()


def get_project_issues(
    *,
    project_id: UUID,
    user: User,
    status: str | None = None,
    priority: str | None = None,
    severity: str | None = None,
    type: str | None = None,
    assignee_id: str | None = None,
    label_name: str | None = None,
    search: str | None = None,
    ordering: str | None = None,
) -> QuerySet[Issue]:
    """
    Returns active issues for a project if the requesting user is a member.
    Supports filtering by status, priority, severity, type, assignee, label,
    search query, and ordering.
    """
    # Enforce project membership isolation
    project = get_project_for_user(project_id=project_id, user=user)
    if not project:
        return Issue.objects.none()

    qs = (
        Issue.objects.filter(project_id=project_id)
        .select_related("project", "reporter", "assignee", "duplicate_of")
        .prefetch_related("labels")
    )

    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if len(statuses) == 1:
            qs = qs.filter(status=statuses[0])
        elif statuses:
            qs = qs.filter(status__in=statuses)

    if priority:
        priorities = [p.strip() for p in priority.split(",") if p.strip()]
        if len(priorities) == 1:
            qs = qs.filter(priority=priorities[0])
        elif priorities:
            qs = qs.filter(priority__in=priorities)

    if severity:
        qs = qs.filter(severity=severity.strip())

    if type:
        qs = qs.filter(type=type.strip())

    if assignee_id:
        if assignee_id.lower() == "unassigned":
            qs = qs.filter(assignee__isnull=True)
        else:
            qs = qs.filter(assignee_id=assignee_id)

    if label_name:
        qs = qs.filter(labels__name__iexact=label_name.strip())

    if search:
        search_term = search.strip()
        qs = qs.filter(
            Q(title__icontains=search_term)
            | Q(description__icontains=search_term)
            | Q(number__icontains=search_term)
        )

    # Valid ordering keys
    allowed_orderings = {
        "created_at": "created_at",
        "-created_at": "-created_at",
        "updated_at": "updated_at",
        "-updated_at": "-updated_at",
        "priority": "priority",
        "-priority": "-priority",
        "position": "position",
        "due_date": "due_date",
        "-due_date": "-due_date",
        "number": "number",
        "-number": "-number",
    }
    if ordering and ordering in allowed_orderings:
        qs = qs.order_by(allowed_orderings[ordering])
    else:
        qs = qs.order_by("-created_at")

    return qs


def get_issue_for_user(*, issue_id: UUID, user: User) -> Issue | None:
    """
    Returns an issue if the user is a member of its parent project.
    """
    return (
        Issue.objects.filter(
            id=issue_id,
            project__memberships__user=user,
        )
        .select_related("project", "reporter", "assignee", "duplicate_of")
        .prefetch_related("labels")
        .first()
    )


def get_project_labels(*, project_id: UUID, user: User) -> QuerySet[Label]:
    """
    Returns labels for a project if the user has access.
    """
    project = get_project_for_user(project_id=project_id, user=user)
    if not project:
        return Label.objects.none()
    return Label.objects.filter(project_id=project_id).order_by("name")


def get_issue_activities(*, issue_id: UUID, user: User) -> QuerySet[Activity]:
    """
    Returns activity log entries for an issue if the user has access to the project.
    """
    return (
        Activity.objects.filter(
            issue_id=issue_id,
            project__memberships__user=user,
        )
        .select_related("actor")
        .order_by("-created_at")
    )


def get_project_board_issues(
    *,
    project_id: UUID,
    user: User,
    priority: str | None = None,
    assignee_id: str | None = None,
    label_name: str | None = None,
    search: str | None = None,
) -> dict[str, list[Issue]] | None:
    """
    Returns active issues for a project grouped by status column and ordered by position ASC.
    Returns None if the user is not a member of the project.
    """
    project = get_project_for_user(project_id=project_id, user=user)
    if not project:
        return None

    qs = (
        Issue.objects.filter(project_id=project_id)
        .select_related("project", "reporter", "assignee", "duplicate_of")
        .prefetch_related("labels")
    )

    if priority:
        priorities = [p.strip() for p in priority.split(",") if p.strip()]
        if len(priorities) == 1:
            qs = qs.filter(priority=priorities[0])
        elif priorities:
            qs = qs.filter(priority__in=priorities)

    if assignee_id:
        if assignee_id.lower() == "unassigned":
            qs = qs.filter(assignee__isnull=True)
        else:
            qs = qs.filter(assignee_id=assignee_id)

    if label_name:
        qs = qs.filter(labels__name__iexact=label_name.strip())

    if search:
        search_term = search.strip()
        qs = qs.filter(
            Q(title__icontains=search_term)
            | Q(description__icontains=search_term)
            | Q(number__icontains=search_term)
        )

    qs = qs.order_by("position", "created_at")

    board: dict[str, list[Issue]] = {status_choice[0]: [] for status_choice in IssueStatus.choices}
    for item in qs:
        if item.status in board:
            board[item.status].append(item)

    return board
