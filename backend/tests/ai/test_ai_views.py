from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from apps.ai.schemas import AISummaryResponse, AITriageResponse
from apps.issues.services import create_comment
from tests.factories import IssueFactory, MembershipFactory, ProjectFactory, UserFactory


@pytest.mark.django_db
class TestAITriageEndpoint:
    def test_triage_authorized_member_success(self, api_client):
        project = ProjectFactory()
        user = project.owner
        api_client.force_authenticate(user=user)

        mock_triage = AITriageResponse(
            title="Database connection leak on worker restart",
            type="bug",
            priority="urgent",
            severity="critical",
            steps_to_reproduce=["Kill worker process", "Observe unclosed connections"],
            expected_behavior="Connections closed cleanly",
            actual_behavior="Connections remain active until timeout",
            suggested_labels=["database", "backend"],
            possible_root_cause="Missing pool.close() in SIGTERM signal handler",
            confidence=0.92,
            reasoning="Critical resource leak affecting worker scalability",
        )

        with patch("apps.ai.views.gemini_service.triage_issue", return_value=mock_triage):
            url = reverse("ai:ai_triage")
            response = api_client.post(
                url,
                {
                    "project_id": str(project.id),
                    "raw_text": "Postgres connections leak when celery workers restart.",
                },
                format="json",
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.data
            assert data["title"] == "Database connection leak on worker restart"
            assert data["priority"] == "urgent"
            assert data["severity"] == "critical"
            assert data["confidence"] == 0.92
            assert data["possible_root_cause"] == "Missing pool.close() in SIGTERM signal handler"

    def test_triage_outsider_forbidden(self, api_client):
        project = ProjectFactory()
        outsider = UserFactory()
        api_client.force_authenticate(user=outsider)

        url = reverse("ai:ai_triage")
        response = api_client.post(
            url,
            {
                "project_id": str(project.id),
                "raw_text": "Non-member trying to use triage.",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_triage_unauthenticated_returns_401(self, api_client):
        url = reverse("ai:ai_triage")
        response = api_client.post(
            url,
            {
                "project_id": "00000000-0000-0000-0000-000000000000",
                "raw_text": "Unauthenticated test",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_triage_validation_errors(self, api_client):
        project = ProjectFactory()
        api_client.force_authenticate(user=project.owner)
        url = reverse("ai:ai_triage")

        # Missing raw_text
        res1 = api_client.post(url, {"project_id": str(project.id)}, format="json")
        assert res1.status_code == status.HTTP_400_BAD_REQUEST

        # Too short raw_text (< 5 chars)
        res2 = api_client.post(
            url,
            {"project_id": str(project.id), "raw_text": "abc"},
            format="json",
        )
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_triage_throttling_exceeded(self, api_client, monkeypatch):
        from apps.ai.throttling import AIUserRateThrottle

        project = ProjectFactory()
        api_client.force_authenticate(user=project.owner)

        # Force throttle rate to 1 request per minute
        monkeypatch.setattr(AIUserRateThrottle, "get_rate", lambda self: "1/minute")

        mock_triage = AITriageResponse(
            title="Throttle test",
            type="bug",
            priority="low",
            severity="trivial",
            confidence=0.5,
        )

        with patch("apps.ai.views.gemini_service.triage_issue", return_value=mock_triage):
            url = reverse("ai:ai_triage")
            # First call succeeds
            res1 = api_client.post(
                url,
                {"project_id": str(project.id), "raw_text": "Valid bug report 1"},
                format="json",
            )
            assert res1.status_code == status.HTTP_200_OK

            # Second call throttled (429)
            res2 = api_client.post(
                url,
                {"project_id": str(project.id), "raw_text": "Valid bug report 2"},
                format="json",
            )
            assert res2.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
class TestAIDuplicatesEndpoint:
    def test_duplicates_authorized_member_success(self, api_client):
        project = ProjectFactory()
        user = project.owner
        api_client.force_authenticate(user=user)

        # Create existing issue
        issue = IssueFactory(
            project=project,
            title="Search bar clears when typing fast",
            reporter=user,
        )

        url = reverse("ai:ai_duplicates")
        with patch(
            "apps.ai.services.duplicates.gemini_service.generate_embedding",
            return_value=None,
        ):
            response = api_client.post(
                url,
                {
                    "project_id": str(project.id),
                    "title": "Search bar resets while typing fast",
                    "threshold": 0.50,
                },
                format="json",
            )

            assert response.status_code == status.HTTP_200_OK
            assert isinstance(response.data, list)
            assert len(response.data) >= 1
            assert response.data[0]["id"] == str(issue.id)
            assert "similarity" in response.data[0]

    def test_duplicates_outsider_forbidden(self, api_client):
        project = ProjectFactory()
        outsider = UserFactory()
        api_client.force_authenticate(user=outsider)

        url = reverse("ai:ai_duplicates")
        response = api_client.post(
            url,
            {
                "project_id": str(project.id),
                "title": "Search bug test",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAISummarizeEndpoint:
    def test_summarize_generate_and_cache(self, api_client):
        project = ProjectFactory()
        user = project.owner
        issue = IssueFactory(
            project=project,
            title="Slow dashboard query",
            description="Takes 5s on large organizations",
            reporter=user,
        )
        api_client.force_authenticate(user=user)

        mock_summary = AISummaryResponse(
            tldr="Dashboard query is slow due to unindexed foreign key lookups.",
            status="Investigating indexing strategy",
            open_questions=["Can we use a composite index?"],
            next_steps=["Add index migration", "Benchmark with 10k rows"],
        )

        url = reverse("ai:ai_summarize", kwargs={"issue_id": issue.id})

        with patch(
            "apps.ai.views.gemini_service.summarize_issue", return_value=mock_summary
        ) as mock_svc:
            # First request: generates and caches
            res1 = api_client.post(url, {}, format="json")
            assert res1.status_code == status.HTTP_200_OK
            assert "Dashboard query is slow" in res1.data["tldr"]
            assert res1.data["is_stale"] is False
            assert mock_svc.call_count == 1

            # Verify saved to Issue model
            issue.refresh_from_db()
            assert "Dashboard query is slow" in issue.ai_summary
            assert issue.ai_metadata["summary"]["status"] == "Investigating indexing strategy"

            # Second request without regenerate: cache hit, Gemini NOT called again
            res2 = api_client.post(url, {}, format="json")
            assert res2.status_code == status.HTTP_200_OK
            assert mock_svc.call_count == 1  # Unchanged!

    def test_summarize_regenerate_flag(self, api_client):
        project = ProjectFactory()
        user = project.owner
        issue = IssueFactory(
            project=project,
            title="Memory leak in worker",
            reporter=user,
        )
        api_client.force_authenticate(user=user)

        mock_summary = AISummaryResponse(
            tldr="Memory leak identified.",
            status="Fixed in dev",
            open_questions=[],
            next_steps=[],
        )

        url = reverse("ai:ai_summarize", kwargs={"issue_id": issue.id})

        with patch(
            "apps.ai.views.gemini_service.summarize_issue", return_value=mock_summary
        ) as mock_svc:
            api_client.post(url, {}, format="json")
            assert mock_svc.call_count == 1

            # Request with regenerate=true: must invoke Gemini again
            api_client.post(url, {"regenerate": True}, format="json")
            assert mock_svc.call_count == 2

    def test_summarize_new_comment_makes_summary_stale(self, api_client):
        project = ProjectFactory()
        user = project.owner
        member = UserFactory()
        MembershipFactory(project=project, user=member)

        issue = IssueFactory(
            project=project,
            title="Intermittent 502 errors",
            reporter=user,
        )
        api_client.force_authenticate(user=user)

        mock_summary = AISummaryResponse(
            tldr="Initial summary before comments.",
            status="Under investigation",
            open_questions=[],
            next_steps=[],
        )

        url = reverse("ai:ai_summarize", kwargs={"issue_id": issue.id})

        with patch("apps.ai.views.gemini_service.summarize_issue", return_value=mock_summary):
            res1 = api_client.post(url, {}, format="json")
            assert res1.status_code == status.HTTP_200_OK
            assert res1.data["is_stale"] is False

        # Refresh issue state from DB after summarize endpoint cached it
        issue.refresh_from_db()

        # Now add a new comment to the issue
        create_comment(
            issue=issue,
            author=member,
            body="Found root cause in nginx proxy buffer settings",
        )

        issue.refresh_from_db()
        assert issue.ai_metadata.get("summary_stale") is True

        # Now when client requests summary, since it is stale, it will regenerate
        new_mock_summary = AISummaryResponse(
            tldr="Updated summary incorporating nginx buffer fix.",
            status="Root cause identified",
            open_questions=[],
            next_steps=["Adjust proxy_buffers in nginx.conf"],
        )

        with patch(
            "apps.ai.views.gemini_service.summarize_issue", return_value=new_mock_summary
        ) as mock_svc:
            res2 = api_client.post(url, {}, format="json")
            assert res2.status_code == status.HTTP_200_OK
            assert "nginx buffer fix" in res2.data["tldr"]
            assert mock_svc.call_count == 1

    def test_summarize_outsider_forbidden(self, api_client):
        project = ProjectFactory()
        outsider = UserFactory()
        issue = IssueFactory(project=project, reporter=project.owner)
        api_client.force_authenticate(user=outsider)

        url = reverse("ai:ai_summarize", kwargs={"issue_id": issue.id})
        response = api_client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
