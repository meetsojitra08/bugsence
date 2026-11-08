from datetime import timedelta
from typing import Any

from django.core.cache import cache
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.issues.models import Issue, IssuePriority, IssueSeverity, IssueStatus
from apps.projects.models import Membership, Project


def get_project_analytics_overview(project: Project) -> dict[str, Any]:
    """
    Computes high-level project KPI metrics including status/priority distributions,
    open vs closed ratios, overdue count, and average resolution time in days.
    Cached for 60 seconds.
    """
    cache_key = f"analytics:{project.id}:overview"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    issues_qs = Issue.objects.filter(project=project)

    # Status distribution
    status_counts = {choice[0]: 0 for choice in IssueStatus.choices}
    for item in issues_qs.values("status").annotate(count=Count("id")):
        status_counts[item["status"]] = item["count"]

    # Priority distribution
    priority_counts = {choice[0]: 0 for choice in IssuePriority.choices}
    for item in issues_qs.values("priority").annotate(count=Count("id")):
        priority_counts[item["priority"]] = item["count"]

    # Severity distribution
    severity_counts = {choice[0]: 0 for choice in IssueSeverity.choices}
    for item in issues_qs.values("severity").annotate(count=Count("id")):
        severity_counts[item["severity"]] = item["count"]

    closed_statuses = [IssueStatus.DONE, IssueStatus.CLOSED]
    open_statuses = [
        IssueStatus.BACKLOG,
        IssueStatus.TODO,
        IssueStatus.IN_PROGRESS,
        IssueStatus.IN_REVIEW,
    ]

    total_issues = issues_qs.count()
    closed_issues = sum(status_counts.get(s, 0) for s in closed_statuses)
    open_issues = sum(status_counts.get(s, 0) for s in open_statuses)

    # Overdue issues: due date in the past and not yet done/closed
    today = timezone.now().date()
    overdue_issues = issues_qs.filter(
        due_date__lt=today,
        status__in=open_statuses,
    ).count()

    # Average resolution time in days (for done/closed issues)
    resolved_times = issues_qs.filter(
        status__in=closed_statuses,
    ).values_list("created_at", "updated_at")

    if resolved_times:
        total_seconds = sum(
            max(0.0, (updated - created).total_seconds()) for created, updated in resolved_times
        )
        avg_resolution_days = round(total_seconds / (len(resolved_times) * 86400.0), 1)
    else:
        avg_resolution_days = 0.0

    result = {
        "total_issues": total_issues,
        "open_issues": open_issues,
        "closed_issues": closed_issues,
        "overdue_issues": overdue_issues,
        "avg_resolution_days": avg_resolution_days,
        "by_status": status_counts,
        "by_priority": priority_counts,
        "by_severity": severity_counts,
    }

    cache.set(cache_key, result, timeout=60)
    return result


def get_project_analytics_trends(project: Project, days: int = 30) -> list[dict[str, Any]]:
    """
    Computes daily issue creation vs resolution trends for the last N days (7, 30, 90).
    Ensures a continuous date sequence without gaps for smooth charting.
    Cached for 60 seconds.
    """
    days = max(7, min(days, 90))
    cache_key = f"analytics:{project.id}:trends:{days}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=days - 1)

    issues_qs = Issue.objects.filter(project=project)

    # Pre-populate date map
    date_map: dict[str, dict[str, Any]] = {}
    curr = start_date
    while curr <= end_date:
        d_str = curr.isoformat()
        date_map[d_str] = {"date": d_str, "created": 0, "resolved": 0}
        curr += timedelta(days=1)

    # Count issues created per day
    created_issues = (
        issues_qs.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        .values("created_at__date")
        .annotate(count=Count("id"))
    )
    for row in created_issues:
        d_str = row["created_at__date"].isoformat()
        if d_str in date_map:
            date_map[d_str]["created"] = row["count"]

    # Count issues resolved per day (status in done/closed)
    resolved_issues = (
        issues_qs.filter(
            status__in=[IssueStatus.DONE, IssueStatus.CLOSED],
            updated_at__date__gte=start_date,
            updated_at__date__lte=end_date,
        )
        .values("updated_at__date")
        .annotate(count=Count("id"))
    )
    for row in resolved_issues:
        d_str = row["updated_at__date"].isoformat()
        if d_str in date_map:
            date_map[d_str]["resolved"] = row["count"]

    result = list(date_map.values())
    cache.set(cache_key, result, timeout=60)
    return result


def get_project_analytics_workload(project: Project) -> list[dict[str, Any]]:
    """
    Computes workload distribution of open issues per member and unassigned issues.
    Returns counts broken down by priority.
    Cached for 60 seconds.
    """
    cache_key = f"analytics:{project.id}:workload"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    open_statuses = [
        IssueStatus.BACKLOG,
        IssueStatus.TODO,
        IssueStatus.IN_PROGRESS,
        IssueStatus.IN_REVIEW,
    ]

    open_issues = Issue.objects.filter(
        project=project,
        status__in=open_statuses,
    ).select_related("assignee")

    # Group by assignee
    workload_map: dict[str | None, dict[str, Any]] = {}

    # Initialize with all project members
    members = Membership.objects.filter(project=project).select_related("user")
    for m in members:
        u = m.user
        workload_map[str(u.id)] = {
            "user": {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "avatar_url": u.avatar_url,
            },
            "count": 0,
            "by_priority": {choice[0]: 0 for choice in IssuePriority.choices},
        }

    # Initialize unassigned bucket
    workload_map[None] = {
        "user": None,
        "count": 0,
        "by_priority": {choice[0]: 0 for choice in IssuePriority.choices},
    }

    for issue in open_issues:
        key = str(issue.assignee_id) if issue.assignee_id else None
        if key not in workload_map:
            if issue.assignee:
                workload_map[key] = {
                    "user": {
                        "id": str(issue.assignee.id),
                        "email": issue.assignee.email,
                        "full_name": issue.assignee.full_name,
                        "avatar_url": issue.assignee.avatar_url,
                    },
                    "count": 0,
                    "by_priority": {choice[0]: 0 for choice in IssuePriority.choices},
                }
            else:
                key = None

        workload_map[key]["count"] += 1
        workload_map[key]["by_priority"][issue.priority] += 1

    # Remove unassigned if count is 0
    if workload_map[None]["count"] == 0:
        del workload_map[None]

    results = list(workload_map.values())
    results.sort(key=lambda x: x["count"], reverse=True)

    cache.set(cache_key, results, timeout=60)
    return results


class BaseProjectAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_project(self, request, project_id: str) -> Project:
        project = get_object_or_404(Project, id=project_id)
        if not Membership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You do not have access to this project's analytics.")
        return project


class ProjectAnalyticsOverviewView(BaseProjectAnalyticsView):
    @extend_schema(
        summary="Retrieve aggregate project health overview metrics",
        responses={
            200: OpenApiResponse(description="Project KPI overview"),
            403: OpenApiResponse(description="Not a project member"),
            404: OpenApiResponse(description="Project not found"),
        },
    )
    def get(self, request, project_id):
        project = self.get_project(request, project_id)
        overview = get_project_analytics_overview(project)
        return Response(overview, status=status.HTTP_200_OK)


class ProjectAnalyticsTrendsView(BaseProjectAnalyticsView):
    @extend_schema(
        summary="Retrieve daily issue creation vs resolution trends",
        responses={
            200: OpenApiResponse(description="Daily issue creation vs resolution trend list"),
            403: OpenApiResponse(description="Not a project member"),
            404: OpenApiResponse(description="Project not found"),
        },
    )
    def get(self, request, project_id):
        project = self.get_project(request, project_id)
        days_param = request.query_params.get("days", "30")
        try:
            days = int(days_param)
        except ValueError:
            days = 30
        trends = get_project_analytics_trends(project, days=days)
        return Response(trends, status=status.HTTP_200_OK)


class ProjectAnalyticsWorkloadView(BaseProjectAnalyticsView):
    @extend_schema(
        summary="Retrieve open issue workload distribution across assignees",
        responses={
            200: OpenApiResponse(description="Assignee workload breakdown list"),
            403: OpenApiResponse(description="Not a project member"),
            404: OpenApiResponse(description="Project not found"),
        },
    )
    def get(self, request, project_id):
        project = self.get_project(request, project_id)
        workload = get_project_analytics_workload(project)
        return Response(workload, status=status.HTTP_200_OK)
