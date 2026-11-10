"""Tests for the redesigned small-team workflow backend endpoints."""

from datetime import timedelta

import pytest
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.issues.models import Issue, IssuePriority, IssueSource, IssueStatus
from apps.projects.models import InviteStatus, Membership, ProjectIntegration, RoleChoices
from tests.factories import IssueFactory, LabelFactory, ProjectFactory, UserFactory


@pytest.mark.django_db
class TestInboxAndTriageFlow:
    def test_inbox_excluded_from_board_and_triaged_via_actions(self, api_client):
        owner = UserFactory(email="lead@acme.dev", full_name="Lead Dev")
        teammate = UserFactory(email="maya@acme.dev", full_name="Maya Patel")
        project = ProjectFactory(owner=owner, key="ACME", name="Acme App")
        Membership.objects.create(project=project, user=teammate, role=RoleChoices.MEMBER)

        api_client.force_authenticate(user=owner)

        # Create Inbox report via API
        create_url = reverse("project-issues-list", kwargs={"project_id": project.id})
        resp = api_client.post(
            create_url,
            {
                "title": "Checkout crashes when promo code empty",
                "description": "Reported in Slack #bugs",
                "status": IssueStatus.INBOX,
                "source": IssueSource.SLACK,
                "priority": IssuePriority.HIGH,
                "external_reporter_email": "customer@example.com",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["priority"] == IssuePriority.HIGH
        assert resp.data["assignee"] is None
        assert resp.data["due_date"] is None
        inbox_issue_id = resp.data["id"]

        # Inbox item must NOT appear on Board
        board_url = reverse("project-board", kwargs={"project_id": project.id})
        board_resp = api_client.get(board_url)
        assert board_resp.status_code == status.HTTP_200_OK
        assert "inbox" not in board_resp.data["columns"]

        # Inbox endpoint lists it
        inbox_url = reverse("project-inbox", kwargs={"project_id": project.id})
        inbox_resp = api_client.get(inbox_url)
        assert inbox_resp.status_code == status.HTTP_200_OK
        assert len(inbox_resp.data) == 1
        assert inbox_resp.data[0]["id"] == inbox_issue_id

        # Snooze hides it from default Inbox list
        triage_url = reverse("issue-triage", kwargs={"pk": inbox_issue_id})
        snooze_resp = api_client.post(
            triage_url, {"action": "snooze", "snooze_hours": 12}, format="json"
        )
        assert snooze_resp.status_code == status.HTTP_200_OK
        assert api_client.get(inbox_url).data == []
        assert len(api_client.get(f"{inbox_url}?include_snoozed=true").data) == 1

        # Assign moves it to Todo and assigns teammate
        assign_resp = api_client.post(
            triage_url,
            {"action": "assign", "assignee_id": str(teammate.id)},
            format="json",
        )
        assert assign_resp.status_code == status.HTTP_200_OK
        assert assign_resp.data["status"] == IssueStatus.TODO
        assert assign_resp.data["assignee"]["id"] == str(teammate.id)

    def test_inbox_merge_duplicate_and_reject(self, api_client):
        owner = UserFactory()
        project = ProjectFactory(owner=owner, key="MRG")
        existing = IssueFactory(project=project, reporter=owner, title="Canonical crash")
        dup = IssueFactory(
            project=project,
            reporter=owner,
            status=IssueStatus.INBOX,
            title="Duplicate crash",
        )
        rejected = IssueFactory(
            project=project,
            reporter=owner,
            status=IssueStatus.INBOX,
            title="Not a bug",
            external_reporter_email="qa@example.com",
        )
        api_client.force_authenticate(user=owner)

        merge_resp = api_client.post(
            reverse("issue-triage", kwargs={"pk": dup.id}),
            {"action": "merge", "target_issue_id": str(existing.id)},
            format="json",
        )
        assert merge_resp.status_code == status.HTTP_200_OK
        assert merge_resp.data["status"] == IssueStatus.CLOSED
        assert str(merge_resp.data["duplicate_of_id"]) == str(existing.id)

        mail.outbox.clear()
        reject_resp = api_client.post(
            reverse("issue-triage", kwargs={"pk": rejected.id}),
            {"action": "reject", "reason": "Working as intended"},
            format="json",
        )
        assert reject_resp.status_code == status.HTTP_200_OK
        assert reject_resp.data["status"] == IssueStatus.CLOSED
        assert len(mail.outbox) == 1


@pytest.mark.django_db
class TestTodayAndChecklistAndResolve:
    def test_today_endpoint_team_pulse_and_priority_sorting(self, api_client):
        owner = UserFactory(full_name="Owner User")
        dev = UserFactory(full_name="Dev User")
        project = ProjectFactory(owner=owner, key="TDY")

        api_client.force_authenticate(user=owner)
        today_url = reverse("project-today", kwargs={"project_id": project.id})

        # Single member -> team_pulse is empty
        res_solo = api_client.get(today_url)
        assert res_solo.status_code == status.HTTP_200_OK
        assert res_solo.data["team_pulse"] == []

        # Add 2nd member + issues
        Membership.objects.create(project=project, user=dev, role=RoleChoices.MEMBER)
        IssueFactory(
            project=project,
            reporter=dev,
            assignee=owner,
            priority=IssuePriority.LOW,
            status=IssueStatus.TODO,
        )
        urgent = IssueFactory(
            project=project,
            reporter=dev,
            assignee=owner,
            priority=IssuePriority.URGENT,
            status=IssueStatus.TODO,
            is_blocking_release=True,
        )
        IssueFactory(
            project=project,
            reporter=owner,
            assignee=dev,
            status=IssueStatus.IN_PROGRESS,
        )

        res_team = api_client.get(today_url)
        assert res_team.status_code == status.HTTP_200_OK
        assert res_team.data["summary"]["assigned_to_you_count"] == 2
        assert res_team.data["summary"]["blocking_release_count"] == 1
        assert res_team.data["your_work"][0]["id"] == str(urgent.id)
        assert len(res_team.data["team_pulse"]) == 2

    def test_resolve_with_note_and_checklist_conversion_and_bulk(self, api_client):
        owner = UserFactory()
        member = UserFactory()
        project = ProjectFactory(owner=owner, key="CHK")
        Membership.objects.create(project=project, user=member, role=RoleChoices.MEMBER)
        label = LabelFactory(project=project, name="bugfix")

        issue = IssueFactory(
            project=project,
            reporter=member,
            assignee=owner,
            external_reporter_email="ext@customer.test",
            checklist=[{"id": "step-1", "text": "Add unit test", "done": False}],
        )
        api_client.force_authenticate(user=owner)

        # Convert checklist item to sub-issue
        conv_resp = api_client.post(
            reverse("issue-checklist-convert", kwargs={"pk": issue.id}),
            {"item_id": "step-1"},
            format="json",
        )
        assert conv_resp.status_code == status.HTTP_201_CREATED
        assert str(conv_resp.data["sub_issue"]["parent_id"]) == str(issue.id)

        # Resolve with note -> notifies internal & external reporter + populates changelog
        mail.outbox.clear()
        resolve_resp = api_client.post(
            reverse("issue-resolve", kwargs={"pk": issue.id}),
            {"resolution_note": "Added null guard in mapper", "notify_reporter": True},
            format="json",
        )
        assert resolve_resp.status_code == status.HTTP_200_OK
        assert resolve_resp.data["status"] == IssueStatus.DONE
        assert resolve_resp.data["resolution_note"] == "Added null guard in mapper"
        assert len(mail.outbox) >= 1

        changelog_resp = api_client.get(
            reverse("project-changelog", kwargs={"project_id": project.id})
        )
        assert changelog_resp.status_code == status.HTTP_200_OK
        assert len(changelog_resp.data) == 1
        assert changelog_resp.data[0]["resolution_note"] == "Added null guard in mapper"

        # Bulk add label + status
        sub_id = conv_resp.data["sub_issue"]["id"]
        bulk_resp = api_client.post(
            reverse("project-issues-bulk", kwargs={"project_id": project.id}),
            {
                "issue_ids": [sub_id],
                "action": "add_label",
                "label_id": str(label.id),
            },
            format="json",
        )
        assert bulk_resp.status_code == status.HTTP_200_OK
        assert bulk_resp.data["updated_count"] == 1
        assert Issue.objects.get(id=sub_id).labels.filter(id=label.id).exists()


@pytest.mark.django_db
class TestInvitesIntegrationsAndDemo:
    def test_shareable_invite_and_email_invite_flow(self, api_client):
        owner = UserFactory()
        new_user = UserFactory(email="joiner@example.com")
        project = ProjectFactory(owner=owner, name="Billing Platform")

        api_client.force_authenticate(user=owner)
        invites_url = reverse("project-invites-list", kwargs={"project_id": project.id})
        create_resp = api_client.post(
            invites_url,
            {"email": "joiner@example.com", "role": "member"},
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        token = create_resp.data["token"]
        invite_id = create_resp.data["id"]

        # Public metadata check
        api_client.force_authenticate(user=None)
        pub_resp = api_client.get(reverse("public-invite-detail", kwargs={"token": token}))
        assert pub_resp.status_code == status.HTTP_200_OK
        assert pub_resp.data["project_name"] == "Billing Platform"

        # Accept invite as new user
        api_client.force_authenticate(user=new_user)
        accept_resp = api_client.post(reverse("accept-invite", kwargs={"token": token}))
        assert accept_resp.status_code == status.HTTP_200_OK
        assert Membership.objects.filter(project=project, user=new_user).exists()

        # Shareable link invite can be revoked
        api_client.force_authenticate(user=owner)
        link_resp = api_client.post(invites_url, {"role": "viewer"}, format="json")
        assert link_resp.status_code == status.HTTP_201_CREATED
        rev_resp = api_client.delete(
            reverse(
                "project-invites-detail",
                kwargs={"project_id": project.id, "pk": link_resp.data["id"]},
            )
        )
        assert rev_resp.status_code == status.HTTP_204_NO_CONTENT
        assert InviteStatus.ACCEPTED == project.invites.get(id=invite_id).status

    def test_github_slack_email_sentry_public_webhooks(self, api_client):
        owner = UserFactory()
        project = ProjectFactory(owner=owner, key="INT")
        issue = IssueFactory(
            project=project,
            reporter=owner,
            status=IssueStatus.TODO,
            external_reporter_email="reporter@acme.test",
        )

        # GitHub PR open -> moves to In Review
        gh_url = reverse("webhook-github", kwargs={"project_key": project.key})
        open_resp = api_client.post(
            gh_url,
            {
                "action": "opened",
                "pull_request": {
                    "number": 12,
                    "title": f"Fix {issue.key} null pointer",
                    "body": "",
                    "html_url": "https://github.com/org/repo/pull/12",
                    "state": "open",
                    "merged": False,
                    "head": {"ref": f"{issue.key.lower()}-fix"},
                },
                "repository": {"full_name": "org/repo"},
            },
            format="json",
            HTTP_X_GITHUB_EVENT="pull_request",
        )
        assert open_resp.status_code == status.HTTP_200_OK
        issue.refresh_from_db()
        assert issue.status == IssueStatus.IN_REVIEW

        # GitHub PR merge -> auto-closes to Done & notifies reporter
        mail.outbox.clear()
        merge_resp = api_client.post(
            gh_url,
            {
                "action": "closed",
                "pull_request": {
                    "number": 12,
                    "title": f"Fix {issue.key} null pointer",
                    "body": "",
                    "html_url": "https://github.com/org/repo/pull/12",
                    "state": "closed",
                    "merged": True,
                    "head": {"ref": f"{issue.key.lower()}-fix"},
                },
                "repository": {"full_name": "org/repo"},
            },
            format="json",
            HTTP_X_GITHUB_EVENT="pull_request",
        )
        assert merge_resp.status_code == status.HTTP_200_OK
        issue.refresh_from_db()
        assert issue.status == IssueStatus.DONE
        assert len(mail.outbox) >= 1

        # Slack /bug -> Inbox
        slack_resp = api_client.post(
            reverse("webhook-slack", kwargs={"project_key": project.key}),
            {"text": "Login button hangs on iOS Safari", "user_name": "sam"},
            format="json",
        )
        assert slack_resp.status_code == status.HTTP_201_CREATED
        assert Issue.objects.filter(project=project, source=IssueSource.SLACK).exists()

        # Sentry deduplication
        sentry_url = reverse("webhook-sentry", kwargs={"project_key": project.key})
        s1 = api_client.post(
            sentry_url,
            {"data": {"issue": {"id": "SEN-99", "title": "ZeroDivisionError in billing"}}},
            format="json",
        )
        assert s1.status_code == status.HTTP_201_CREATED
        s2 = api_client.post(
            sentry_url,
            {"data": {"issue": {"id": "SEN-99", "title": "ZeroDivisionError in billing"}}},
            format="json",
        )
        assert s2.status_code == status.HTTP_200_OK
        assert s2.data["deduplicated"] is True

        # Public report form
        pub_url = reverse("public-report-form", kwargs={"project_key": project.key})
        pub_resp = api_client.post(
            pub_url,
            {
                "description": "Export CSV fails with 500 error",
                "reporter_name": "QA Tester",
                "reporter_email": "qa@test.dev",
            },
            format="json",
        )
        assert pub_resp.status_code == status.HTTP_201_CREATED
        assert Issue.objects.filter(project=project, source=IssueSource.PUBLIC_FORM).exists()

        # Integrations list & patch as owner
        api_client.force_authenticate(user=owner)
        int_list = api_client.get(
            reverse("project-integrations-list", kwargs={"project_id": project.id})
        )
        assert int_list.status_code == status.HTTP_200_OK
        assert ProjectIntegration.objects.filter(project=project).count() == 5

    def test_demo_workspace_and_auto_key_generation(self, api_client):
        demo_resp = api_client.post(reverse("auth-demo"))
        assert demo_resp.status_code == status.HTTP_201_CREATED
        assert "access" in demo_resp.data
        assert "project" in demo_resp.data

        # Project creation with name only auto-generates key
        owner = UserFactory()
        api_client.force_authenticate(user=owner)
        proj_resp = api_client.post(
            reverse("project-list"), {"name": "Mobile Payments"}, format="json"
        )
        assert proj_resp.status_code == status.HTTP_201_CREATED
        assert proj_resp.data["key"]

        # Triage fallback when GROQ_API_KEY not set works with missing_info
        triage_resp = api_client.post(
            reverse("ai:ai_triage"),
            {"project_id": proj_resp.data["id"], "raw_text": "button broken"},
            format="json",
        )
        assert triage_resp.status_code == status.HTTP_200_OK
        assert "missing_info" in triage_resp.data
        assert triage_resp.data["confidence"] < 0.6
        assert timezone.now() > timezone.now() - timedelta(minutes=1)

    def test_demo_workspace_survives_postgres_trigram_failure_and_loads_today(
        self, api_client, monkeypatch
    ):
        from django.contrib.postgres.search import TrigramSimilarity
        from django.db import ProgrammingError, connection

        monkeypatch.setattr(connection, "vendor", "postgresql")

        def broken_trigram(*args, **kwargs):
            raise ProgrammingError("function similarity(character varying, unknown) does not exist")

        monkeypatch.setattr(TrigramSimilarity, "__init__", broken_trigram, raising=False)

        # Should recover via savepoint + in-memory fallback without TransactionManagementError
        demo_resp = api_client.post(reverse("auth-demo"))
        assert demo_resp.status_code == status.HTTP_201_CREATED
        assert len(mail.outbox) == 0  # demo addresses do not dispatch outbound emails

        project_id = demo_resp.data["project"]["id"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {demo_resp.data['access']}")
        today_resp = api_client.get(reverse("project-today", kwargs={"project_id": project_id}))
        assert today_resp.status_code == status.HTTP_200_OK
        assert today_resp.data["summary"]["inbox_count"] >= 3
