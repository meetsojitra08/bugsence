"""Tests for Comments CRUD, mention parsing/notifications, and unified activity timeline."""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.issues.models import Activity, Comment, IssuePriority, IssueStatus
from apps.notifications.models import Notification, NotificationKind
from apps.projects.models import Membership, RoleChoices
from tests.factories import IssueFactory, ProjectFactory, UserFactory


@pytest.fixture
def comments_project_setup():
    """Sets up a project with owner, admin, member, viewer, and outsider users."""
    owner = UserFactory(email="owner@bugsense.dev", full_name="Oliver Owner")
    admin = UserFactory(email="admin@bugsense.dev", full_name="Alice Admin")
    member = UserFactory(email="member@bugsense.dev", full_name="Mona Member")
    viewer = UserFactory(email="viewer@bugsense.dev", full_name="Victor Viewer")
    outsider = UserFactory(email="outsider@bugsense.dev", full_name="Oscar Outsider")

    project = ProjectFactory(owner=owner, key="CMT", name="Comments Workspace")
    Membership.objects.create(project=project, user=admin, role=RoleChoices.ADMIN)
    Membership.objects.create(project=project, user=member, role=RoleChoices.MEMBER)
    Membership.objects.create(project=project, user=viewer, role=RoleChoices.VIEWER)

    issue = IssueFactory(
        project=project,
        reporter=member,
        status=IssueStatus.TODO,
        priority=IssuePriority.HIGH,
    )

    return {
        "project": project,
        "issue": issue,
        "owner": owner,
        "admin": admin,
        "member": member,
        "viewer": viewer,
        "outsider": outsider,
    }


@pytest.mark.django_db
class TestCommentCreation:
    """Covers comment creation permissions, validation, and activity logging."""

    def test_member_can_create_comment(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]
        api_client.force_authenticate(user=member)

        url = reverse("issue-comments", kwargs={"pk": issue.id})
        resp = api_client.post(url, {"body": "Investigating this bug right now."}, format="json")

        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["body"] == "Investigating this bug right now."
        assert resp.data["author"]["id"] == str(member.id)
        assert resp.data["is_edited"] is False
        assert resp.data["edited_at"] is None

        # Verify Comment in DB
        assert Comment.objects.filter(issue=issue, author=member).count() == 1

        # Verify activity log entry created
        activity = Activity.objects.filter(issue=issue, verb="commented").first()
        assert activity is not None
        assert activity.actor == member

    def test_create_comment_by_project_key_and_number(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]
        project = comments_project_setup["project"]
        api_client.force_authenticate(user=member)

        url = reverse(
            "project-issue-comments-by-number",
            kwargs={"project_identifier": project.key, "number": issue.number},
        )
        resp = api_client.post(url, {"body": "Commented via key-and-number route!"}, format="json")

        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["body"] == "Commented via key-and-number route!"

    def test_viewer_forbidden_from_creating_comment(self, api_client, comments_project_setup):
        viewer = comments_project_setup["viewer"]
        issue = comments_project_setup["issue"]
        api_client.force_authenticate(user=viewer)

        url = reverse("issue-comments", kwargs={"pk": issue.id})
        resp = api_client.post(url, {"body": "Viewer trying to post."}, format="json")

        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert Comment.objects.count() == 0

    def test_outsider_cannot_create_comment_returns_404(self, api_client, comments_project_setup):
        outsider = comments_project_setup["outsider"]
        issue = comments_project_setup["issue"]
        api_client.force_authenticate(user=outsider)

        url = reverse("issue-comments", kwargs={"pk": issue.id})
        resp = api_client.post(url, {"body": "Outsider comment."}, format="json")

        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthenticated_returns_401(self, api_client, comments_project_setup):
        issue = comments_project_setup["issue"]
        url = reverse("issue-comments", kwargs={"pk": issue.id})
        resp = api_client.post(url, {"body": "Anon comment."}, format="json")

        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_blank_body_validation_error(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]
        api_client.force_authenticate(user=member)

        url = reverse("issue-comments", kwargs={"pk": issue.id})
        resp = api_client.post(url, {"body": "   "}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCommentEditAndDeletePermissions:
    """Covers permission rules for editing and deleting comments."""

    def test_author_can_edit_own_comment(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]
        api_client.force_authenticate(user=member)

        comment = Comment.objects.create(
            issue=issue, author=member, body="Initial comment content."
        )

        url = reverse("comment-detail", kwargs={"pk": comment.id})
        resp = api_client.patch(
            url, {"body": "Updated comment content with extra detail."}, format="json"
        )

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["body"] == "Updated comment content with extra detail."
        assert resp.data["is_edited"] is True
        assert resp.data["edited_at"] is not None

        comment.refresh_from_db()
        assert comment.body == "Updated comment content with extra detail."
        assert comment.edited_at is not None

    def test_admin_and_owner_can_edit_others_comment(self, api_client, comments_project_setup):
        admin = comments_project_setup["admin"]
        owner = comments_project_setup["owner"]
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]

        comment = Comment.objects.create(
            issue=issue, author=member, body="Original member comment."
        )

        # Admin edits
        api_client.force_authenticate(user=admin)
        url = reverse("comment-detail", kwargs={"pk": comment.id})
        resp = api_client.patch(url, {"body": "Admin edited this comment."}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_edited"] is True

        # Owner edits
        api_client.force_authenticate(user=owner)
        resp2 = api_client.patch(url, {"body": "Owner edited this comment."}, format="json")
        assert resp2.status_code == status.HTTP_200_OK

    def test_regular_member_cannot_edit_another_members_comment(
        self, api_client, comments_project_setup
    ):
        project = comments_project_setup["project"]
        issue = comments_project_setup["issue"]
        member1 = comments_project_setup["member"]

        member2 = UserFactory(email="member2@bugsense.dev")
        Membership.objects.create(project=project, user=member2, role=RoleChoices.MEMBER)

        comment = Comment.objects.create(issue=issue, author=member1, body="Member 1 content.")

        api_client.force_authenticate(user=member2)
        url = reverse("comment-detail", kwargs={"pk": comment.id})
        resp = api_client.patch(url, {"body": "Member 2 trying to hijack."}, format="json")

        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_author_can_delete_own_comment(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]
        comment = Comment.objects.create(issue=issue, author=member, body="To be deleted.")

        api_client.force_authenticate(user=member)
        url = reverse("comment-detail", kwargs={"pk": comment.id})
        resp = api_client.delete(url)

        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert Comment.objects.filter(id=comment.id).count() == 0

    def test_admin_and_owner_can_delete_others_comment(self, api_client, comments_project_setup):
        admin = comments_project_setup["admin"]
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]

        c1 = Comment.objects.create(issue=issue, author=member, body="Member msg 1.")
        c2 = Comment.objects.create(issue=issue, author=member, body="Member msg 2.")

        # Admin deletes c1
        api_client.force_authenticate(user=admin)
        url1 = reverse("comment-detail", kwargs={"pk": c1.id})
        resp1 = api_client.delete(url1)
        assert resp1.status_code == status.HTTP_204_NO_CONTENT
        assert not Comment.objects.filter(id=c1.id).exists()

        # Owner deletes c2
        owner = comments_project_setup["owner"]
        api_client.force_authenticate(user=owner)
        url2 = reverse("comment-detail", kwargs={"pk": c2.id})
        resp2 = api_client.delete(url2)
        assert resp2.status_code == status.HTTP_204_NO_CONTENT
        assert not Comment.objects.filter(id=c2.id).exists()

    def test_regular_member_cannot_delete_others_comment(self, api_client, comments_project_setup):
        admin = comments_project_setup["admin"]
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]

        comment = Comment.objects.create(issue=issue, author=admin, body="Admin message.")

        api_client.force_authenticate(user=member)
        url = reverse("comment-detail", kwargs={"pk": comment.id})
        resp = api_client.delete(url)

        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert Comment.objects.filter(id=comment.id).exists()


@pytest.mark.django_db
class TestMentionParsingAndNotifications:
    """Covers @mention extraction and Notification generation."""

    def test_mention_project_member_creates_notification(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        admin = comments_project_setup["admin"]
        issue = comments_project_setup["issue"]

        api_client.force_authenticate(user=member)
        url = reverse("issue-comments", kwargs={"pk": issue.id})

        # admin email is 'admin@bugsense.dev', prefix is 'admin'
        resp = api_client.post(
            url,
            {"body": "Hey @admin, can you review the stack trace?"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        # Verify Notification in DB
        notifications = Notification.objects.filter(recipient=admin)
        assert notifications.count() == 1

        notif = notifications.first()
        assert notif.actor == member
        assert notif.issue == issue
        assert notif.kind == NotificationKind.MENTION
        assert "mentioned you on" in notif.title
        assert "stack trace" in notif.message
        assert notif.is_read is False

    def test_mention_multiple_members_deduplicates(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        admin = comments_project_setup["admin"]
        owner = comments_project_setup["owner"]
        issue = comments_project_setup["issue"]

        api_client.force_authenticate(user=member)
        url = reverse("issue-comments", kwargs={"pk": issue.id})

        # Mentions admin twice and owner once
        resp = api_client.post(
            url,
            {"body": "Pinging @admin and @owner, also @admin please reply asap!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        # Admin should have exactly 1 notification, owner 1
        assert Notification.objects.filter(recipient=admin).count() == 1
        assert Notification.objects.filter(recipient=owner).count() == 1

    def test_self_mention_does_not_create_notification(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]

        api_client.force_authenticate(user=member)
        url = reverse("issue-comments", kwargs={"pk": issue.id})

        resp = api_client.post(
            url,
            {"body": "Note to myself @member finish this tomorrow."},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        # Author is member, should NOT be notified
        assert Notification.objects.filter(recipient=member).count() == 0

    def test_mention_non_member_ignored(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        outsider = comments_project_setup["outsider"]
        issue = comments_project_setup["issue"]

        api_client.force_authenticate(user=member)
        url = reverse("issue-comments", kwargs={"pk": issue.id})

        # outsider is 'outsider@bugsense.dev' but not a member of CMT project
        resp = api_client.post(
            url,
            {"body": "Hello @outsider and @nonexistent_user"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        assert Notification.objects.filter(recipient=outsider).count() == 0
        assert Notification.objects.count() == 0


@pytest.mark.django_db
class TestUnifiedTimelineOrdering:
    """Covers chronological merging of activities and comments."""

    def test_timeline_merges_activities_and_comments_chronologically(
        self, api_client, comments_project_setup
    ):
        admin = comments_project_setup["admin"]
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]

        api_client.force_authenticate(user=admin)

        # 1. First comment
        Comment.objects.create(
            issue=issue,
            author=member,
            body="First comment on issue",
        )

        # 2. Activity: change status
        detail_url = reverse("issue-detail", kwargs={"pk": issue.id})
        api_client.patch(
            detail_url,
            {"status": IssueStatus.IN_PROGRESS},
            format="json",
        )

        # 3. Second comment
        Comment.objects.create(
            issue=issue,
            author=admin,
            body="Second comment after status change",
        )

        # 4. Fetch unified timeline
        timeline_url = reverse("issue-activity", kwargs={"pk": issue.id})
        resp = api_client.get(timeline_url)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.data

        # Should have at least: created (activity), comment 1, status_changed (activity), comment 2
        types = [item["type"] for item in data]
        assert "activity" in types
        assert "comment" in types

        # Check chronological ordering
        timestamps = [item["created_at"] for item in data]
        assert timestamps == sorted(timestamps)

        # Comment items have body and author info
        comment_items = [item for item in data if item["type"] == "comment"]
        assert len(comment_items) == 2
        assert comment_items[0]["body"] == "First comment on issue"
        assert comment_items[1]["body"] == "Second comment after status change"
        assert comment_items[0]["actor"]["email"] == member.email

    def test_project_by_number_timeline_endpoint(self, api_client, comments_project_setup):
        member = comments_project_setup["member"]
        issue = comments_project_setup["issue"]
        project = comments_project_setup["project"]

        Comment.objects.create(
            issue=issue,
            author=member,
            body="Comment on issue #1",
        )

        api_client.force_authenticate(user=member)
        url = reverse(
            "project-issue-activity-by-number",
            kwargs={"project_identifier": project.key, "number": issue.number},
        )
        resp = api_client.get(url)

        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) >= 2  # created activity + comment
