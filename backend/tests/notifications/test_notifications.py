import pytest
from django.urls import reverse
from rest_framework import status

from apps.issues.models import IssueStatus
from apps.issues.services import create_comment, create_issue, move_issue, update_issue
from apps.notifications.models import Notification, NotificationKind
from tests.factories import IssueFactory, MembershipFactory, ProjectFactory, UserFactory


@pytest.mark.django_db
class TestNotificationEndpoints:
    def test_list_notifications_and_filter_unread(self, api_client):
        user = UserFactory()
        other = UserFactory()
        api_client.force_authenticate(user=user)

        # Create 1 unread and 1 read notification for user
        notif1 = Notification.objects.create(
            recipient=user,
            actor=other,
            kind=NotificationKind.ASSIGNED,
            title="Assigned to BUG-1",
            message="Please review",
        )
        Notification.objects.create(
            recipient=user,
            actor=other,
            kind=NotificationKind.COMMENT,
            title="New comment on BUG-2",
            message="Check this",
            read_at="2026-11-08T12:00:00Z",
        )

        url = reverse("notifications:notification-list")

        # List all
        res_all = api_client.get(url)
        assert res_all.status_code == status.HTTP_200_OK
        assert res_all.data["count"] == 2

        # Filter unread=true
        res_unread = api_client.get(url, {"unread": "true"})
        assert res_unread.status_code == status.HTTP_200_OK
        assert res_unread.data["count"] == 1
        assert res_unread.data["results"][0]["id"] == str(notif1.id)

    def test_unread_count_endpoint(self, api_client):
        user = UserFactory()
        api_client.force_authenticate(user=user)

        Notification.objects.create(
            recipient=user,
            kind=NotificationKind.ASSIGNED,
            title="Task 1",
        )
        Notification.objects.create(
            recipient=user,
            kind=NotificationKind.ASSIGNED,
            title="Task 2",
        )

        url = reverse("notifications:notification-unread-count")
        res = api_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 2

    def test_mark_single_notification_read(self, api_client):
        user = UserFactory()
        other_user = UserFactory()
        api_client.force_authenticate(user=user)

        notif = Notification.objects.create(
            recipient=user,
            kind=NotificationKind.ASSIGNED,
            title="Assignment",
        )
        other_notif = Notification.objects.create(
            recipient=other_user,
            kind=NotificationKind.ASSIGNED,
            title="Other",
        )

        url = reverse("notifications:notification-mark-read", kwargs={"pk": notif.id})
        res = api_client.post(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["is_read"] is True

        notif.refresh_from_db()
        assert notif.read_at is not None

        # Cannot mark another user's notification
        other_url = reverse("notifications:notification-mark-read", kwargs={"pk": other_notif.id})
        res_other = api_client.post(other_url)
        assert res_other.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_all_read(self, api_client):
        user = UserFactory()
        api_client.force_authenticate(user=user)

        Notification.objects.create(recipient=user, kind=NotificationKind.ASSIGNED, title="1")
        Notification.objects.create(recipient=user, kind=NotificationKind.ASSIGNED, title="2")

        url = reverse("notifications:notification-mark-all-read")
        res = api_client.post(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["marked_read_count"] == 2

        unread_remaining = Notification.objects.filter(recipient=user, read_at__isnull=True).count()
        assert unread_remaining == 0


@pytest.mark.django_db
class TestNotificationTriggers:
    def test_assigned_notification_on_issue_creation(self):
        project = ProjectFactory()
        reporter = project.owner
        assignee = UserFactory()
        MembershipFactory(project=project, user=assignee)

        issue = create_issue(
            project=project,
            reporter=reporter,
            title="Assigned bug",
            assignee=assignee,
        )

        notif = Notification.objects.filter(recipient=assignee, issue=issue).first()
        assert notif is not None
        assert notif.kind == NotificationKind.ASSIGNED
        assert "assigned you to" in notif.title

    def test_assigned_notification_on_issue_update(self):
        project = ProjectFactory()
        reporter = project.owner
        new_assignee = UserFactory()
        MembershipFactory(project=project, user=new_assignee)

        issue = IssueFactory(project=project, reporter=reporter, assignee=None)

        update_issue(
            issue=issue,
            actor=reporter,
            assignee=new_assignee,
        )

        notif = Notification.objects.filter(recipient=new_assignee, issue=issue).first()
        assert notif is not None
        assert notif.kind == NotificationKind.ASSIGNED

    def test_status_changed_notification_notifies_reporter_and_assignee(self):
        project = ProjectFactory()
        reporter = UserFactory()
        assignee = UserFactory()
        dev = UserFactory()
        MembershipFactory(project=project, user=reporter)
        MembershipFactory(project=project, user=assignee)
        MembershipFactory(project=project, user=dev)

        issue = IssueFactory(
            project=project,
            reporter=reporter,
            assignee=assignee,
            status=IssueStatus.TODO,
        )

        # Dev changes status to in_progress
        update_issue(
            issue=issue,
            actor=dev,
            status=IssueStatus.IN_PROGRESS,
        )

        reporter_notif = Notification.objects.filter(
            recipient=reporter,
            issue=issue,
            kind=NotificationKind.STATUS_CHANGED,
        ).first()
        assignee_notif = Notification.objects.filter(
            recipient=assignee,
            issue=issue,
            kind=NotificationKind.STATUS_CHANGED,
        ).first()
        dev_notif = Notification.objects.filter(
            recipient=dev,
            issue=issue,
            kind=NotificationKind.STATUS_CHANGED,
        ).first()

        assert reporter_notif is not None
        assert assignee_notif is not None
        assert dev_notif is None  # Actor should never be notified

    def test_status_changed_notification_on_board_move(self):
        project = ProjectFactory()
        reporter = UserFactory()
        dev = UserFactory()
        MembershipFactory(project=project, user=reporter)
        MembershipFactory(project=project, user=dev)

        issue = IssueFactory(
            project=project,
            reporter=reporter,
            status=IssueStatus.TODO,
        )

        move_issue(
            issue=issue,
            actor=dev,
            status=IssueStatus.DONE,
        )

        notif = Notification.objects.filter(
            recipient=reporter,
            issue=issue,
            kind=NotificationKind.STATUS_CHANGED,
        ).first()
        assert notif is not None
        assert "Status changed to done" in notif.title

    def test_comment_notification_notifies_reporter_and_assignee(self):
        project = ProjectFactory()
        reporter = UserFactory()
        assignee = UserFactory()
        commenter = UserFactory()
        MembershipFactory(project=project, user=reporter)
        MembershipFactory(project=project, user=assignee)
        MembershipFactory(project=project, user=commenter)

        issue = IssueFactory(
            project=project,
            reporter=reporter,
            assignee=assignee,
        )

        create_comment(
            issue=issue,
            author=commenter,
            body="Working on reproducing this now.",
        )

        reporter_notif = Notification.objects.filter(
            recipient=reporter,
            issue=issue,
            kind=NotificationKind.COMMENT,
        ).first()
        assignee_notif = Notification.objects.filter(
            recipient=assignee,
            issue=issue,
            kind=NotificationKind.COMMENT,
        ).first()

        assert reporter_notif is not None
        assert assignee_notif is not None
        assert "New comment on" in reporter_notif.title
