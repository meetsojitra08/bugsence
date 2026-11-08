from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.issues.models import IssuePriority, IssueSeverity, IssueStatus
from apps.projects.analytics import (
    get_project_analytics_overview,
    get_project_analytics_trends,
    get_project_analytics_workload,
)
from tests.factories import IssueFactory, MembershipFactory, ProjectFactory, UserFactory


@pytest.mark.django_db
class TestProjectAnalyticsOverview:
    def test_overview_metrics_calculation(self):
        project = ProjectFactory()
        user = project.owner

        today = timezone.now().date()
        past_due = today - timedelta(days=2)
        future_due = today + timedelta(days=5)

        # Create open issues
        IssueFactory(
            project=project,
            status=IssueStatus.TODO,
            priority=IssuePriority.HIGH,
            severity=IssueSeverity.MAJOR,
            due_date=past_due,  # overdue
            reporter=user,
        )
        IssueFactory(
            project=project,
            status=IssueStatus.IN_PROGRESS,
            priority=IssuePriority.URGENT,
            severity=IssueSeverity.CRITICAL,
            due_date=future_due,
            reporter=user,
        )

        # Create closed issue
        closed_issue = IssueFactory(
            project=project,
            status=IssueStatus.DONE,
            priority=IssuePriority.LOW,
            severity=IssueSeverity.TRIVIAL,
            reporter=user,
        )
        # Simulate resolution time: 2 days
        closed_issue.created_at = timezone.now() - timedelta(days=2)
        closed_issue.updated_at = timezone.now()
        closed_issue.save(update_fields=["created_at", "updated_at"])

        data = get_project_analytics_overview(project)

        assert data["total_issues"] == 3
        assert data["open_issues"] == 2
        assert data["closed_issues"] == 1
        assert data["overdue_issues"] == 1
        assert data["avg_resolution_days"] >= 1.9
        assert data["by_status"][IssueStatus.TODO] == 1
        assert data["by_status"][IssueStatus.IN_PROGRESS] == 1
        assert data["by_status"][IssueStatus.DONE] == 1
        assert data["by_priority"][IssuePriority.HIGH] == 1
        assert data["by_priority"][IssuePriority.URGENT] == 1
        assert data["by_severity"][IssueSeverity.CRITICAL] == 1

    def test_overview_endpoint_access_and_scoping(self, api_client):
        project = ProjectFactory()
        member = UserFactory()
        MembershipFactory(project=project, user=member)
        outsider = UserFactory()

        url = reverse("project-analytics-overview", kwargs={"project_id": project.id})

        # Member allowed
        api_client.force_authenticate(user=member)
        res_member = api_client.get(url)
        assert res_member.status_code == status.HTTP_200_OK
        assert "total_issues" in res_member.data

        # Outsider forbidden
        api_client.force_authenticate(user=outsider)
        res_outsider = api_client.get(url)
        assert res_outsider.status_code == status.HTTP_403_FORBIDDEN

        # Unauthenticated rejected
        api_client.force_authenticate(user=None)
        res_anon = api_client.get(url)
        assert res_anon.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestProjectAnalyticsTrends:
    def test_trends_continuous_date_sequence(self):
        project = ProjectFactory()
        trends = get_project_analytics_trends(project, days=7)

        assert len(trends) == 7
        for item in trends:
            assert "date" in item
            assert "created" in item
            assert "resolved" in item

    def test_trends_endpoint(self, api_client):
        project = ProjectFactory()
        api_client.force_authenticate(user=project.owner)

        url = reverse("project-analytics-trends", kwargs={"project_id": project.id})
        res = api_client.get(url, {"days": 14})

        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 14


@pytest.mark.django_db
class TestProjectAnalyticsWorkload:
    def test_workload_assignee_distribution(self):
        project = ProjectFactory()
        owner = project.owner
        dev = UserFactory()
        MembershipFactory(project=project, user=dev)

        # 2 open issues assigned to dev
        IssueFactory(
            project=project,
            assignee=dev,
            status=IssueStatus.TODO,
            priority=IssuePriority.HIGH,
            reporter=owner,
        )
        IssueFactory(
            project=project,
            assignee=dev,
            status=IssueStatus.IN_PROGRESS,
            priority=IssuePriority.MEDIUM,
            reporter=owner,
        )

        # 1 unassigned open issue
        IssueFactory(
            project=project,
            assignee=None,
            status=IssueStatus.TODO,
            reporter=owner,
        )

        workload = get_project_analytics_workload(project)

        # Sorted descending by count
        assert len(workload) >= 2
        dev_workload = next(w for w in workload if w["user"] and w["user"]["id"] == str(dev.id))
        assert dev_workload["count"] == 2
        assert dev_workload["by_priority"][IssuePriority.HIGH] == 1

        unassigned = next(w for w in workload if w["user"] is None)
        assert unassigned["count"] == 1

    def test_workload_endpoint(self, api_client):
        project = ProjectFactory()
        api_client.force_authenticate(user=project.owner)

        url = reverse("project-analytics-workload", kwargs={"project_id": project.id})
        res = api_client.get(url)

        assert res.status_code == status.HTTP_200_OK
        assert isinstance(res.data, list)
