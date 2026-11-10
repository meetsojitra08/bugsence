"""Personal 'Today' action home endpoint for a project."""

from datetime import timedelta
from uuid import UUID

from django.db.models import Case, IntegerField, Q, Value, When
from django.utils import timezone
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.issues.models import Issue, IssuePriority, IssueStatus
from apps.issues.notifications_dispatch import get_or_rotate_project_triager
from apps.issues.serializers import IssueListSerializer
from apps.notifications.models import Notification, NotificationKind
from apps.projects.models import Membership, RoleChoices
from apps.projects.selectors import get_project_for_user


def _priority_order():
    return Case(
        When(priority=IssuePriority.URGENT, then=Value(0)),
        When(priority=IssuePriority.HIGH, then=Value(1)),
        When(priority=IssuePriority.MEDIUM, then=Value(2)),
        When(priority=IssuePriority.LOW, then=Value(3)),
        default=Value(4),
        output_field=IntegerField(),
    )


class ProjectTodayView(APIView):
    """
    Returns the personal action view for the signed-in user in a project:
    - Top strip counters (inbox, stale inbox, assigned to you, blocking release)
    - Your work (assigned issues sorted by priority)
    - Waiting on you (PRs awaiting review, @mentions, resolved issues you reported)
    - Team pulse (2+ active members only: each member's current in-progress issue)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: UUID) -> Response:
        project = get_project_for_user(project_id=project_id, user=request.user)
        if not project:
            raise NotFound("Project not found.")

        triager = get_or_rotate_project_triager(project)
        now = timezone.now()
        stale_cutoff = now - timedelta(hours=24)

        inbox_qs = Issue.objects.filter(
            project=project,
            status=IssueStatus.INBOX,
        ).filter(Q(snoozed_until__isnull=True) | Q(snoozed_until__lte=now))

        inbox_count = inbox_qs.count()
        stale_inbox_count = inbox_qs.filter(created_at__lte=stale_cutoff).count()

        active_open_statuses = [
            IssueStatus.TODO,
            IssueStatus.IN_PROGRESS,
            IssueStatus.IN_REVIEW,
        ]

        your_work_qs = (
            Issue.objects.filter(
                project=project,
                assignee=request.user,
                status__in=active_open_statuses,
            )
            .select_related("project", "reporter", "assignee")
            .prefetch_related("labels", "pull_requests")
            .order_by(_priority_order(), "-updated_at")
        )

        blocking_release_count = (
            Issue.objects.filter(
                project=project,
                status__in=[
                    IssueStatus.BACKLOG,
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.IN_REVIEW,
                ],
            )
            .filter(Q(is_blocking_release=True) | Q(priority=IssuePriority.URGENT))
            .count()
        )

        # Waiting on you:
        # 1) PRs awaiting review (issues in in_review or with open PRs)
        prs_awaiting_review = (
            Issue.objects.filter(
                project=project,
                status=IssueStatus.IN_REVIEW,
            )
            .select_related("project", "reporter", "assignee")
            .prefetch_related("labels", "pull_requests")
            .order_by("-updated_at")[:10]
        )

        # 2) @mentions for this user in this project (avoid SELECT DISTINCT + Meta.ordering on PG)
        raw_mention_ids = (
            Notification.objects.filter(
                recipient=request.user,
                kind=NotificationKind.MENTION,
                issue__project=project,
                read_at__isnull=True,
                issue_id__isnull=False,
            )
            .order_by("-created_at")
            .values_list("issue_id", flat=True)[:25]
        )
        mention_issue_ids = list(dict.fromkeys(raw_mention_ids))[:10]
        mentioned_issues = (
            Issue.objects.filter(id__in=mention_issue_ids)
            .select_related("project", "reporter", "assignee")
            .prefetch_related("labels", "pull_requests")
        )

        # 3) Issues you reported that were resolved recently (last 14 days)
        resolved_reported = (
            Issue.objects.filter(
                project=project,
                reporter=request.user,
                status__in=[IssueStatus.DONE, IssueStatus.CLOSED],
                updated_at__gte=now - timedelta(days=14),
            )
            .select_related("project", "reporter", "assignee")
            .prefetch_related("labels", "pull_requests")
            .order_by("-updated_at")[:8]
        )

        # Team pulse (2+ members only)
        memberships = list(
            Membership.objects.filter(project=project)
            .exclude(role=RoleChoices.VIEWER)
            .select_related("user")
            .order_by("created_at")
        )
        team_pulse = []
        if len(memberships) >= 2:
            for mem in memberships:
                u = mem.user
                current_issue = (
                    Issue.objects.filter(
                        project=project,
                        assignee=u,
                        status=IssueStatus.IN_PROGRESS,
                    )
                    .select_related("project", "reporter", "assignee")
                    .prefetch_related("labels", "pull_requests")
                    .order_by(_priority_order(), "-updated_at")
                    .first()
                )
                team_pulse.append(
                    {
                        "user": {
                            "id": str(u.id),
                            "email": u.email,
                            "full_name": u.full_name or u.display_name,
                            "avatar_url": u.avatar_url,
                        },
                        "role": mem.role,
                        "current_issue": (
                            IssueListSerializer(current_issue).data if current_issue else None
                        ),
                    }
                )

        total_issues = Issue.objects.filter(project=project).count()

        return Response(
            {
                "summary": {
                    "inbox_count": inbox_count,
                    "stale_inbox_count": stale_inbox_count,
                    "assigned_to_you_count": your_work_qs.count(),
                    "blocking_release_count": blocking_release_count,
                    "total_issues": total_issues,
                    "triager": (
                        {
                            "id": str(triager.id),
                            "full_name": triager.full_name or triager.display_name,
                            "email": triager.email,
                        }
                        if triager
                        else None
                    ),
                    "is_current_user_triager": bool(triager and triager.id == request.user.id),
                },
                "your_work": IssueListSerializer(your_work_qs, many=True).data,
                "waiting_on_you": {
                    "prs_awaiting_review": IssueListSerializer(prs_awaiting_review, many=True).data,
                    "mentions": IssueListSerializer(mentioned_issues, many=True).data,
                    "resolved_reported": IssueListSerializer(resolved_reported, many=True).data,
                },
                "team_pulse": team_pulse,
                "member_count": len(memberships),
            }
        )
