"""Tests for Issues Core API endpoints, numbering, filters, and permissions."""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.issues.models import IssuePriority, IssueStatus, Label
from apps.projects.models import Membership, RoleChoices
from tests.factories import IssueFactory, LabelFactory, ProjectFactory, UserFactory


@pytest.fixture
def project_with_roles():
    """
    Sets up a project with owner, admin, member, and viewer users.
    """
    owner = UserFactory(email="owner@bugsense.dev")
    admin = UserFactory(email="admin@bugsense.dev")
    member = UserFactory(email="member@bugsense.dev")
    viewer = UserFactory(email="viewer@bugsense.dev")
    outsider = UserFactory(email="outsider@bugsense.dev")

    project = ProjectFactory(owner=owner, key="BUG", name="BugSense Core")
    Membership.objects.create(project=project, user=admin, role=RoleChoices.ADMIN)
    Membership.objects.create(project=project, user=member, role=RoleChoices.MEMBER)
    Membership.objects.create(project=project, user=viewer, role=RoleChoices.VIEWER)

    return {
        "project": project,
        "owner": owner,
        "admin": admin,
        "member": member,
        "viewer": viewer,
        "outsider": outsider,
    }


@pytest.mark.django_db
class TestIssueNumberingAndIsolation:
    """Covers per-project sequential numbering and isolation."""

    def test_sequential_numbering_per_project(self, project_with_roles):
        project = project_with_roles["project"]
        owner = project_with_roles["owner"]

        issue1 = IssueFactory(project=project, reporter=owner, title="First Issue")
        issue2 = IssueFactory(project=project, reporter=owner, title="Second Issue")
        issue3 = IssueFactory(project=project, reporter=owner, title="Third Issue")

        assert issue1.number == 1
        assert issue1.key == "BUG-1"
        assert issue2.number == 2
        assert issue2.key == "BUG-2"
        assert issue3.number == 3
        assert issue3.key == "BUG-3"

    def test_numbering_isolated_across_projects(self, project_with_roles):
        project_a = project_with_roles["project"]
        owner = project_with_roles["owner"]

        project_b = ProjectFactory(owner=owner, key="SEC", name="Security Project")

        issue_a1 = IssueFactory(project=project_a, reporter=owner)
        issue_b1 = IssueFactory(project=project_b, reporter=owner)
        issue_a2 = IssueFactory(project=project_a, reporter=owner)

        assert issue_a1.number == 1
        assert issue_a1.key == "BUG-1"
        assert issue_b1.number == 1
        assert issue_b1.key == "SEC-1"
        assert issue_a2.number == 2
        assert issue_a2.key == "BUG-2"

    def test_soft_deleted_issue_number_not_reused(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        owner = project_with_roles["owner"]
        api_client.force_authenticate(user=owner)

        issue1 = IssueFactory(project=project, reporter=owner)
        assert issue1.number == 1

        # Delete issue 1
        del_url = reverse("issue-detail", kwargs={"pk": issue1.id})
        response = api_client.delete(del_url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Create new issue - must get number 2
        create_url = reverse("project-issues-list", kwargs={"project_id": project.id})
        create_resp = api_client.post(create_url, {"title": "Next Issue"}, format="json")
        assert create_resp.status_code == status.HTTP_201_CREATED
        assert create_resp.data["number"] == 2
        assert create_resp.data["key"] == "BUG-2"


@pytest.mark.django_db
class TestIssueFiltersAndSearch:
    """Covers issue filtering by status, priority, assignee, labels, search, and ordering."""

    def test_filter_by_status_and_priority(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        owner = project_with_roles["owner"]
        api_client.force_authenticate(user=owner)

        i1 = IssueFactory(
            project=project, reporter=owner, status=IssueStatus.TODO, priority=IssuePriority.HIGH
        )
        i2 = IssueFactory(
            project=project,
            reporter=owner,
            status=IssueStatus.IN_PROGRESS,
            priority=IssuePriority.LOW,
        )
        i3 = IssueFactory(
            project=project, reporter=owner, status=IssueStatus.DONE, priority=IssuePriority.HIGH
        )

        url = reverse("project-issues-list", kwargs={"project_id": project.id})

        # Single status filter
        resp = api_client.get(f"{url}?status=todo")
        assert resp.status_code == status.HTTP_200_OK
        ids = [x["id"] for x in resp.data["results"]]
        assert str(i1.id) in ids
        assert str(i2.id) not in ids
        assert str(i3.id) not in ids

        # Comma-separated status filter
        resp = api_client.get(f"{url}?status=todo,in_progress")
        ids = [x["id"] for x in resp.data["results"]]
        assert str(i1.id) in ids
        assert str(i2.id) in ids
        assert str(i3.id) not in ids

        # Filter by priority
        resp = api_client.get(f"{url}?priority=high")
        ids = [x["id"] for x in resp.data["results"]]
        assert str(i1.id) in ids
        assert str(i3.id) in ids
        assert str(i2.id) not in ids

    def test_filter_by_assignee(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        owner = project_with_roles["owner"]
        member = project_with_roles["member"]
        api_client.force_authenticate(user=owner)

        i_assigned = IssueFactory(project=project, reporter=owner, assignee=member)
        i_unassigned = IssueFactory(project=project, reporter=owner, assignee=None)

        url = reverse("project-issues-list", kwargs={"project_id": project.id})

        # Specific assignee
        resp = api_client.get(f"{url}?assignee={member.id}")
        ids = [x["id"] for x in resp.data["results"]]
        assert str(i_assigned.id) in ids
        assert str(i_unassigned.id) not in ids

        # Unassigned filter
        resp = api_client.get(f"{url}?assignee=unassigned")
        ids = [x["id"] for x in resp.data["results"]]
        assert str(i_unassigned.id) in ids
        assert str(i_assigned.id) not in ids

    def test_filter_by_label(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        owner = project_with_roles["owner"]
        api_client.force_authenticate(user=owner)

        lbl_backend = LabelFactory(project=project, name="Backend")
        lbl_frontend = LabelFactory(project=project, name="Frontend")

        i1 = IssueFactory(project=project, reporter=owner, labels=[lbl_backend])
        i2 = IssueFactory(project=project, reporter=owner, labels=[lbl_frontend])

        url = reverse("project-issues-list", kwargs={"project_id": project.id})
        resp = api_client.get(f"{url}?label=backend")
        ids = [x["id"] for x in resp.data["results"]]
        assert str(i1.id) in ids
        assert str(i2.id) not in ids

    def test_search_by_text_and_number(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        owner = project_with_roles["owner"]
        api_client.force_authenticate(user=owner)

        i1 = IssueFactory(
            project=project,
            reporter=owner,
            title="Crash on checkout button",
            description="Memory spike",
        )
        i2 = IssueFactory(
            project=project,
            reporter=owner,
            title="Refactor auth token",
            description="Use JWT rotation",
        )

        url = reverse("project-issues-list", kwargs={"project_id": project.id})

        resp = api_client.get(f"{url}?search=checkout")
        ids = [x["id"] for x in resp.data["results"]]
        assert str(i1.id) in ids
        assert str(i2.id) not in ids

        resp = api_client.get(f"{url}?search={i2.number}")
        ids = [x["id"] for x in resp.data["results"]]
        assert str(i2.id) in ids


@pytest.mark.django_db
class TestIssueRolePermissions:
    """Covers role permissions: viewer read-only, member own vs others delete, admin/owner full."""

    def test_viewer_is_read_only(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        viewer = project_with_roles["viewer"]
        owner = project_with_roles["owner"]
        issue = IssueFactory(project=project, reporter=owner)

        api_client.force_authenticate(user=viewer)

        # Viewer can read list
        list_url = reverse("project-issues-list", kwargs={"project_id": project.id})
        assert api_client.get(list_url).status_code == status.HTTP_200_OK

        # Viewer can read detail
        detail_url = reverse("issue-detail", kwargs={"pk": issue.id})
        assert api_client.get(detail_url).status_code == status.HTTP_200_OK

        # Viewer CANNOT create
        create_resp = api_client.post(list_url, {"title": "Viewer attempt"}, format="json")
        assert create_resp.status_code == status.HTTP_403_FORBIDDEN

        # Viewer CANNOT update
        patch_resp = api_client.patch(detail_url, {"title": "Hacked"}, format="json")
        assert patch_resp.status_code == status.HTTP_403_FORBIDDEN

        # Viewer CANNOT delete
        del_resp = api_client.delete(detail_url)
        assert del_resp.status_code == status.HTTP_403_FORBIDDEN

    def test_member_can_delete_own_issue_but_not_others(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        member = project_with_roles["member"]
        owner = project_with_roles["owner"]

        own_issue = IssueFactory(project=project, reporter=member, title="My bug")
        others_issue = IssueFactory(project=project, reporter=owner, title="Owner bug")

        api_client.force_authenticate(user=member)

        # Member deletes own issue -> Allowed
        del_own = api_client.delete(reverse("issue-detail", kwargs={"pk": own_issue.id}))
        assert del_own.status_code == status.HTTP_204_NO_CONTENT

        # Member attempts to delete another member's issue -> Forbidden
        del_other = api_client.delete(reverse("issue-detail", kwargs={"pk": others_issue.id}))
        assert del_other.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_and_owner_can_delete_any_issue(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        admin = project_with_roles["admin"]
        member = project_with_roles["member"]

        member_issue = IssueFactory(project=project, reporter=member)

        # Admin deletes member's issue -> Allowed
        api_client.force_authenticate(user=admin)
        del_resp = api_client.delete(reverse("issue-detail", kwargs={"pk": member_issue.id}))
        assert del_resp.status_code == status.HTTP_204_NO_CONTENT

    def test_outsider_returns_404(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        outsider = project_with_roles["outsider"]
        issue = IssueFactory(project=project)

        api_client.force_authenticate(user=outsider)

        # Scoped list returns 404
        list_url = reverse("project-issues-list", kwargs={"project_id": project.id})
        assert api_client.get(list_url).status_code == status.HTTP_404_NOT_FOUND

        # Detail returns 404
        detail_url = reverse("issue-detail", kwargs={"pk": issue.id})
        assert api_client.get(detail_url).status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestActivityLoggingAndDiff:
    """Covers activity log generation on create, field updates, assignments, and deletes."""

    def test_activity_logged_on_create_and_update(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        admin = project_with_roles["admin"]
        member = project_with_roles["member"]
        api_client.force_authenticate(user=admin)

        # 1. Create issue
        create_url = reverse("project-issues-list", kwargs={"project_id": project.id})
        create_resp = api_client.post(
            create_url,
            {
                "title": "Payment gateway timeout",
                "priority": IssuePriority.LOW,
                "status": IssueStatus.TODO,
            },
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        issue_id = create_resp.data["id"]

        # 2. Update status and priority
        detail_url = reverse("issue-detail", kwargs={"pk": issue_id})
        patch_resp = api_client.patch(
            detail_url,
            {
                "status": IssueStatus.IN_PROGRESS,
                "priority": IssuePriority.URGENT,
                "assignee_id": str(member.id),
            },
            format="json",
        )
        assert patch_resp.status_code == status.HTTP_200_OK

        # 3. Retrieve activities
        act_url = reverse("issue-activity", kwargs={"pk": issue_id})
        act_resp = api_client.get(act_url)
        assert act_resp.status_code == status.HTTP_200_OK

        verbs = [a["verb"] for a in act_resp.data]
        fields = [a["field"] for a in act_resp.data]

        assert "created" in verbs
        assert "status_changed" in verbs
        assert "priority_changed" in verbs
        assert "assigned" in verbs
        assert "status" in fields
        assert "priority" in fields

        # Check diff values
        status_act = next(a for a in act_resp.data if a["verb"] == "status_changed")
        assert status_act["old_value"] == IssueStatus.TODO
        assert status_act["new_value"] == IssueStatus.IN_PROGRESS


@pytest.mark.django_db
class TestSoftDeleteAndRestore:
    """Covers soft-delete and undo/restore functionality."""

    def test_soft_delete_and_restore_cycle(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        owner = project_with_roles["owner"]
        issue = IssueFactory(project=project, reporter=owner, title="Recoverable bug")
        api_client.force_authenticate(user=owner)

        detail_url = reverse("issue-detail", kwargs={"pk": issue.id})
        restore_url = reverse("issue-restore", kwargs={"pk": issue.id})
        list_url = reverse("project-issues-list", kwargs={"project_id": project.id})

        # Soft delete
        del_resp = api_client.delete(detail_url)
        assert del_resp.status_code == status.HTTP_204_NO_CONTENT

        # Confirm not visible in active list
        list_resp = api_client.get(list_url)
        active_ids = [x["id"] for x in list_resp.data["results"]]
        assert str(issue.id) not in active_ids

        # Confirm 404 on normal retrieve
        assert api_client.get(detail_url).status_code == status.HTTP_404_NOT_FOUND

        # Restore issue
        restore_resp = api_client.post(restore_url)
        assert restore_resp.status_code == status.HTTP_200_OK
        assert restore_resp.data["id"] == str(issue.id)

        # Confirm visible again in active list
        list_resp2 = api_client.get(list_url)
        active_ids2 = [x["id"] for x in list_resp2.data["results"]]
        assert str(issue.id) in active_ids2


@pytest.mark.django_db
class TestProjectLabelsAPI:
    """Covers label listing, creation with hex color validation, and deletion."""

    def test_create_and_list_labels(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        admin = project_with_roles["admin"]
        api_client.force_authenticate(user=admin)

        url = reverse("project-labels-list", kwargs={"project_id": project.id})

        # Valid label
        payload = {"name": "Performance", "color": "#10B981", "description": "Perf improvements"}
        resp = api_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "Performance"
        assert resp.data["color"] == "#10B981"

        # Invalid hex color rejected
        bad_payload = {"name": "Broken Color", "color": "not-a-color"}
        bad_resp = api_client.post(url, bad_payload, format="json")
        assert bad_resp.status_code == status.HTTP_400_BAD_REQUEST

        # List labels
        list_resp = api_client.get(url)
        assert list_resp.status_code == status.HTTP_200_OK
        assert any(label_item["name"] == "Performance" for label_item in list_resp.data)

    def test_delete_label(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        admin = project_with_roles["admin"]
        label = LabelFactory(project=project, name="Obsolete")

        api_client.force_authenticate(user=admin)
        del_url = reverse("label-detail", kwargs={"pk": label.id})
        del_resp = api_client.delete(del_url)
        assert del_resp.status_code == status.HTTP_204_NO_CONTENT
        assert not Label.objects.filter(id=label.id).exists()


@pytest.mark.django_db
class TestLookupByProjectKeyAndNumber:
    """Covers lookup by project key and sequential number (/p/:key/issues/:number)."""

    def test_lookup_by_key_and_number(self, api_client, project_with_roles):
        project = project_with_roles["project"]
        member = project_with_roles["member"]
        issue = IssueFactory(project=project, reporter=member, title="Key lookup test")

        api_client.force_authenticate(user=member)
        url = reverse(
            "project-issue-by-number",
            kwargs={"project_identifier": project.key, "number": issue.number},
        )
        resp = api_client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(issue.id)
        assert resp.data["key"] == f"BUG-{issue.number}"
