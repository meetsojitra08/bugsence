"""Tests for Kanban Board API, issue move positioning, and rebalancing."""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.issues.models import IssuePriority, IssueStatus
from apps.issues.services import POSITION_DEFAULT_STEP, POSITION_GAP_THRESHOLD, rebalance_positions
from apps.projects.models import Membership, RoleChoices
from tests.factories import IssueFactory, ProjectFactory, UserFactory


@pytest.fixture
def board_project_setup():
    """Sets up a project with owner, member, and viewer for board testing."""
    owner = UserFactory(email="owner@bugsense.dev")
    member = UserFactory(email="member@bugsense.dev")
    viewer = UserFactory(email="viewer@bugsense.dev")
    outsider = UserFactory(email="outsider@bugsense.dev")

    project = ProjectFactory(owner=owner, key="KBN", name="Kanban Workspace")
    Membership.objects.create(project=project, user=member, role=RoleChoices.MEMBER)
    Membership.objects.create(project=project, user=viewer, role=RoleChoices.VIEWER)

    return {
        "project": project,
        "owner": owner,
        "member": member,
        "viewer": viewer,
        "outsider": outsider,
    }


@pytest.mark.django_db
class TestIssueMovePositioning:
    """Covers midpoint float calculation for board ordering."""

    def test_move_between_items_computes_midpoint(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        member = board_project_setup["member"]
        api_client.force_authenticate(user=member)

        i1 = IssueFactory(project=project, status=IssueStatus.TODO, position=1000.0)
        i2 = IssueFactory(project=project, status=IssueStatus.TODO, position=2000.0)
        i3 = IssueFactory(project=project, status=IssueStatus.BACKLOG, position=500.0)

        url = reverse("issue-move", kwargs={"pk": i3.id})
        payload = {
            "status": IssueStatus.TODO,
            "before_id": str(i1.id),
            "after_id": str(i2.id),
        }
        resp = api_client.post(url, payload, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == IssueStatus.TODO
        assert resp.data["position"] == 1500.0

    def test_move_to_top_of_column(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        member = board_project_setup["member"]
        api_client.force_authenticate(user=member)

        i1 = IssueFactory(project=project, status=IssueStatus.TODO, position=1000.0)
        i2 = IssueFactory(project=project, status=IssueStatus.TODO, position=2000.0)

        url = reverse("issue-move", kwargs={"pk": i2.id})
        payload = {
            "status": IssueStatus.TODO,
            "after_id": str(i1.id),
        }
        resp = api_client.post(url, payload, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["position"] == 500.0

    def test_move_to_bottom_of_column(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        member = board_project_setup["member"]
        api_client.force_authenticate(user=member)

        i1 = IssueFactory(project=project, status=IssueStatus.TODO, position=1000.0)
        i2 = IssueFactory(project=project, status=IssueStatus.BACKLOG, position=500.0)

        url = reverse("issue-move", kwargs={"pk": i2.id})
        payload = {
            "status": IssueStatus.TODO,
            "before_id": str(i1.id),
        }
        resp = api_client.post(url, payload, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["position"] == 1000.0 + POSITION_DEFAULT_STEP

    def test_move_to_empty_column(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        member = board_project_setup["member"]
        api_client.force_authenticate(user=member)

        i1 = IssueFactory(project=project, status=IssueStatus.TODO)

        url = reverse("issue-move", kwargs={"pk": i1.id})
        payload = {"status": IssueStatus.DONE}
        resp = api_client.post(url, payload, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == IssueStatus.DONE
        assert resp.data["position"] == POSITION_DEFAULT_STEP


@pytest.mark.django_db
class TestRebalancingThreshold:
    """Covers automatic rebalance when positions become too tight (< 1e-6)."""

    def test_rebalance_positions_service(self, board_project_setup):
        project = board_project_setup["project"]

        # Create 3 issues with very tight spacing
        i1 = IssueFactory(project=project, status=IssueStatus.TODO, position=10.0000001)
        i2 = IssueFactory(project=project, status=IssueStatus.TODO, position=10.0000002)
        i3 = IssueFactory(project=project, status=IssueStatus.TODO, position=10.0000003)

        rebalance_positions(project=project, status=IssueStatus.TODO)

        i1.refresh_from_db()
        i2.refresh_from_db()
        i3.refresh_from_db()

        assert i1.position == POSITION_DEFAULT_STEP
        assert i2.position == POSITION_DEFAULT_STEP * 2
        assert i3.position == POSITION_DEFAULT_STEP * 3

    def test_automatic_rebalance_on_move(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        member = board_project_setup["member"]
        api_client.force_authenticate(user=member)

        # Gap < 1e-6
        i1 = IssueFactory(project=project, status=IssueStatus.TODO, position=100.0)
        i2 = IssueFactory(
            project=project, status=IssueStatus.TODO, position=100.0 + (POSITION_GAP_THRESHOLD / 2)
        )
        i3 = IssueFactory(project=project, status=IssueStatus.BACKLOG, position=50.0)

        url = reverse("issue-move", kwargs={"pk": i3.id})
        payload = {
            "status": IssueStatus.TODO,
            "before_id": str(i1.id),
            "after_id": str(i2.id),
        }
        resp = api_client.post(url, payload, format="json")

        assert resp.status_code == status.HTTP_200_OK
        i1.refresh_from_db()
        i2.refresh_from_db()
        # After rebalance, gap between neighbors is expanded cleanly
        assert abs(i2.position - i1.position) >= POSITION_DEFAULT_STEP


@pytest.mark.django_db
class TestMoveActivityAndPermissions:
    """Covers activity log generation on move and role authorization."""

    def test_status_changed_activity_logged_only_when_status_changes(
        self, api_client, board_project_setup
    ):
        project = board_project_setup["project"]
        member = board_project_setup["member"]
        api_client.force_authenticate(user=member)

        issue = IssueFactory(project=project, status=IssueStatus.TODO)

        url = reverse("issue-move", kwargs={"pk": issue.id})

        # 1. Move within same column (reorder only)
        resp1 = api_client.post(url, {"status": IssueStatus.TODO}, format="json")
        assert resp1.status_code == status.HTTP_200_OK

        act_url = reverse("issue-activity", kwargs={"pk": issue.id})
        act_resp1 = api_client.get(act_url)
        verbs1 = [a["verb"] for a in act_resp1.data]
        assert "status_changed" not in verbs1

        # 2. Move to different column
        resp2 = api_client.post(url, {"status": IssueStatus.IN_PROGRESS}, format="json")
        assert resp2.status_code == status.HTTP_200_OK

        act_resp2 = api_client.get(act_url)
        verbs2 = [a["verb"] for a in act_resp2.data]
        assert "status_changed" in verbs2

        status_act = next(a for a in act_resp2.data if a["verb"] == "status_changed")
        assert status_act["old_value"] == IssueStatus.TODO
        assert status_act["new_value"] == IssueStatus.IN_PROGRESS

    def test_viewer_forbidden_from_moving_issue(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        viewer = board_project_setup["viewer"]
        issue = IssueFactory(project=project, status=IssueStatus.TODO)

        api_client.force_authenticate(user=viewer)
        url = reverse("issue-move", kwargs={"pk": issue.id})
        resp = api_client.post(url, {"status": IssueStatus.DONE}, format="json")

        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_outsider_returns_404_on_move(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        outsider = board_project_setup["outsider"]
        issue = IssueFactory(project=project)

        api_client.force_authenticate(user=outsider)
        url = reverse("issue-move", kwargs={"pk": issue.id})
        resp = api_client.post(url, {"status": IssueStatus.DONE}, format="json")

        assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestProjectBoardEndpoint:
    """Covers project kanban board grouping, column sorting, and filtering."""

    def test_get_project_board_grouped_by_status(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        owner = board_project_setup["owner"]
        api_client.force_authenticate(user=owner)

        i_todo2 = IssueFactory(
            project=project, status=IssueStatus.TODO, position=200.0, title="Todo Two"
        )
        i_todo1 = IssueFactory(
            project=project, status=IssueStatus.TODO, position=100.0, title="Todo One"
        )
        i_prog = IssueFactory(
            project=project, status=IssueStatus.IN_PROGRESS, position=50.0, title="In Progress One"
        )
        i_done = IssueFactory(
            project=project, status=IssueStatus.DONE, position=30.0, title="Done One"
        )

        url = reverse("project-board", kwargs={"project_id": project.id})
        resp = api_client.get(url)

        assert resp.status_code == status.HTTP_200_OK
        data = resp.data

        assert "columns" in data
        assert "counts" in data

        columns = data["columns"]
        counts = data["counts"]

        # Check grouping and counts
        assert counts["todo"] == 2
        assert counts["in_progress"] == 1
        assert counts["done"] == 1
        assert counts["backlog"] == 0

        # Check ascending position order within column
        todo_ids = [item["id"] for item in columns["todo"]]
        assert todo_ids == [str(i_todo1.id), str(i_todo2.id)]
        assert columns["in_progress"][0]["id"] == str(i_prog.id)
        assert columns["done"][0]["id"] == str(i_done.id)

    def test_filter_board_by_priority(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        owner = board_project_setup["owner"]
        api_client.force_authenticate(user=owner)

        i_urgent = IssueFactory(
            project=project, status=IssueStatus.TODO, priority=IssuePriority.URGENT
        )
        i_low = IssueFactory(project=project, status=IssueStatus.TODO, priority=IssuePriority.LOW)

        url = reverse("project-board", kwargs={"project_id": project.id})
        resp = api_client.get(f"{url}?priority=urgent")

        assert resp.status_code == status.HTTP_200_OK
        todo_items = resp.data["columns"]["todo"]
        todo_ids = [x["id"] for x in todo_items]

        assert str(i_urgent.id) in todo_ids
        assert str(i_low.id) not in todo_ids

    def test_non_member_board_returns_404(self, api_client, board_project_setup):
        project = board_project_setup["project"]
        outsider = board_project_setup["outsider"]
        api_client.force_authenticate(user=outsider)

        url = reverse("project-board", kwargs={"project_id": project.id})
        resp = api_client.get(url)

        assert resp.status_code == status.HTTP_404_NOT_FOUND
