from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet
from django.utils import timezone

from apps.issues.models import Activity, Comment, Issue, IssueStatus, Label
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
    overdue: bool = False,
    exclude_inbox: bool = False,
    recently_closed: bool = False,
    blocking: bool = False,
) -> QuerySet[Issue]:
    """
    Returns active issues for a project if the requesting user is a member.
    Supports filtering by status, priority, severity, type, assignee, label,
    search query, saved views, and ordering.
    """
    # Enforce project membership isolation
    project = get_project_for_user(project_id=project_id, user=user)
    if not project:
        return Issue.objects.none()

    qs = (
        Issue.objects.filter(project_id=project_id)
        .select_related("project", "reporter", "assignee", "duplicate_of", "parent")
        .prefetch_related("labels", "pull_requests", "sub_issues")
    )

    if exclude_inbox and not status:
        qs = qs.exclude(status=IssueStatus.INBOX)

    if recently_closed:
        qs = qs.filter(status__in=[IssueStatus.DONE, IssueStatus.CLOSED])
        if not ordering:
            ordering = "-updated_at"

    if blocking:
        qs = qs.filter(is_blocking_release=True)

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

    if overdue:
        qs = qs.filter(
            due_date__lt=timezone.localdate(),
            status__in=[
                IssueStatus.BACKLOG,
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.IN_REVIEW,
            ],
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
        .select_related("project", "reporter", "assignee", "duplicate_of", "parent")
        .prefetch_related("labels", "pull_requests", "sub_issues")
        .first()
    )


def get_project_inbox_issues(
    *,
    project_id: UUID,
    user: User,
    include_snoozed: bool = False,
) -> QuerySet[Issue]:
    """Returns untriaged Inbox issues for a project."""
    project = get_project_for_user(project_id=project_id, user=user)
    if not project:
        return Issue.objects.none()

    qs = (
        Issue.objects.filter(project_id=project_id, status=IssueStatus.INBOX)
        .select_related("project", "reporter", "assignee", "duplicate_of", "parent")
        .prefetch_related("labels", "pull_requests")
    )
    if not include_snoozed:
        now = timezone.now()
        qs = qs.filter(Q(snoozed_until__isnull=True) | Q(snoozed_until__lte=now))
    return qs.order_by("-created_at")


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
        .exclude(status=IssueStatus.INBOX)
        .select_related("project", "reporter", "assignee", "duplicate_of", "parent")
        .prefetch_related("labels", "pull_requests")
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

    board_statuses = [
        IssueStatus.BACKLOG,
        IssueStatus.TODO,
        IssueStatus.IN_PROGRESS,
        IssueStatus.IN_REVIEW,
        IssueStatus.DONE,
        IssueStatus.CLOSED,
    ]
    board: dict[str, list[Issue]] = {s: [] for s in board_statuses}
    for item in qs:
        if item.status in board:
            board[item.status].append(item)

    return board


def get_issue_comments(
    *,
    issue_id: UUID,
    user: User,
) -> QuerySet[Comment] | None:
    """
    Returns comments for an issue if the user is a member of its project.
    Ordered chronologically by created_at ascending.
    """
    issue = get_issue_for_user(issue_id=issue_id, user=user)
    if not issue:
        return None

    return Comment.objects.filter(issue_id=issue_id).select_related("author").order_by("created_at")


def get_comment_for_user(
    *,
    comment_id: UUID,
    user: User,
) -> Comment | None:
    """
    Returns a comment if the user is a member of its project.
    """
    return (
        Comment.objects.filter(
            id=comment_id,
            issue__project__memberships__user=user,
        )
        .select_related("issue", "issue__project", "author")
        .first()
    )


def get_issue_timeline(
    *,
    issue_id: UUID,
    user: User,
) -> list[dict] | None:
    """
    Merges activities and comments for an issue into a unified chronological timeline.
    Ordered by created_at ASC.
    Returns None if user is not a project member or issue doesn't exist.
    """
    issue = get_issue_for_user(issue_id=issue_id, user=user)
    if not issue:
        return None

    activities = list(
        Activity.objects.filter(issue_id=issue_id).select_related("actor").order_by("created_at")
    )
    comments = list(
        Comment.objects.filter(issue_id=issue_id).select_related("author").order_by("created_at")
    )

    timeline: list[dict] = []

    for act in activities:
        actor_data = {
            "id": act.actor.id if act.actor else None,
            "email": act.actor.email if act.actor else "system@bugsense.dev",
            "full_name": act.actor.full_name if act.actor else "System",
            "avatar_url": getattr(act.actor, "avatar_url", "") if act.actor else "",
        }
        timeline.append(
            {
                "id": act.id,
                "type": "activity",
                "actor": actor_data,
                "verb": act.verb,
                "field": act.field,
                "old_value": act.old_value,
                "new_value": act.new_value,
                "body": "",
                "is_edited": False,
                "edited_at": None,
                "created_at": act.created_at,
            }
        )

    for comm in comments:
        author_data = {
            "id": comm.author.id,
            "email": comm.author.email,
            "full_name": comm.author.full_name,
            "avatar_url": getattr(comm.author, "avatar_url", ""),
        }
        timeline.append(
            {
                "id": comm.id,
                "type": "comment",
                "actor": author_data,
                "verb": "commented",
                "field": "",
                "old_value": "",
                "new_value": "",
                "body": comm.body,
                "is_edited": comm.is_edited,
                "edited_at": comm.edited_at,
                "created_at": comm.created_at,
            }
        )

    timeline.sort(key=lambda x: x["created_at"])
    return timeline
