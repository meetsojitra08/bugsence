from unittest.mock import MagicMock, patch

import pytest

from apps.ai.models import AIRequestLog, AIRequestLogKind
from apps.ai.services.duplicates import (
    find_duplicate_issues,
    python_trigram_similarity,
)
from apps.ai.services.groq import AIServiceUnavailable, AITimeoutError, GroqService
from tests.factories import IssueFactory, ProjectFactory, UserFactory


@pytest.mark.django_db
class TestGroqTriageService:
    def test_triage_issue_success(self):
        service = GroqService(api_key="test-api-key")
        user = UserFactory()

        mock_response = MagicMock()
        mock_response.choices[0].message.content = """{
            "title": "Null pointer on empty kanban board",
            "type": "bug",
            "priority": "high",
            "severity": "major",
            "steps_to_reproduce": ["Navigate to empty project", "Open Kanban board"],
            "expected_behavior": "Display empty board columns with placeholder",
            "actual_behavior": "Page crashes with white screen",
            "suggested_labels": ["frontend", "kanban"],
            "possible_root_cause": "KanbanColumn filters issues without checking undefined",
            "confidence": 0.95,
            "reasoning": "Causes crash for all zero-issue projects on load"
        }"""
        mock_response.usage.prompt_tokens = 120
        mock_response.usage.completion_tokens = 60

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.chat.completions.create.return_value = mock_response
            mock_get_client.return_value = mock_client

            result = service.triage_issue(
                raw_text="Board crashes when project has no issues",
                project_labels=["frontend", "backend", "kanban"],
                user=user,
            )

            assert result.title == "Null pointer on empty kanban board"
            assert result.type == "bug"
            assert result.priority == "high"
            assert result.severity == "major"
            assert len(result.steps_to_reproduce) == 2
            assert result.confidence == 0.95
            assert "frontend" in result.suggested_labels

            # Verify AIRequestLog recorded
            log = AIRequestLog.objects.filter(user=user, kind=AIRequestLogKind.TRIAGE).first()
            assert log is not None
            assert log.success is True
            assert log.tokens_in == 120
            assert log.tokens_out == 60

    def test_triage_retry_on_first_attempt_invalid_json(self):
        service = GroqService(api_key="test-api-key")
        user = UserFactory()

        # First call returns invalid JSON, second call returns valid JSON
        mock_bad_resp = MagicMock()
        mock_bad_resp.choices[0].message.content = "This is not valid json {"
        mock_bad_resp.usage.prompt_tokens = 100
        mock_bad_resp.usage.completion_tokens = 20

        mock_good_resp = MagicMock()
        mock_good_resp.choices[0].message.content = """{
            "title": "Recovered from retry",
            "type": "bug",
            "priority": "medium",
            "severity": "minor",
            "steps_to_reproduce": ["Tap button"],
            "expected_behavior": "Success",
            "actual_behavior": "Failure",
            "suggested_labels": [],
            "possible_root_cause": "Race condition",
            "confidence": 0.8,
            "reasoning": "Recovered"
        }"""
        mock_good_resp.usage.prompt_tokens = 110
        mock_good_resp.usage.completion_tokens = 50

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.chat.completions.create.side_effect = [mock_bad_resp, mock_good_resp]
            mock_get_client.return_value = mock_client

            result = service.triage_issue(
                raw_text="Some error report",
                project_labels=[],
                user=user,
            )

            assert result.title == "Recovered from retry"
            assert mock_client.chat.completions.create.call_count == 2

            log = AIRequestLog.objects.filter(user=user, kind=AIRequestLogKind.TRIAGE).first()
            assert log is not None
            assert log.success is True
            assert log.tokens_in == 210

    def test_triage_timeout_raises_ai_timeout_error(self):
        service = GroqService(api_key="test-api-key")
        user = UserFactory()

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.chat.completions.create.side_effect = TimeoutError("Deadline exceeded")
            mock_get_client.return_value = mock_client

            with pytest.raises(AITimeoutError):
                service.triage_issue(
                    raw_text="Long running request",
                    project_labels=[],
                    user=user,
                )

            log = AIRequestLog.objects.filter(user=user, kind=AIRequestLogKind.TRIAGE).first()
            assert log is not None
            assert log.success is False
            assert "timed out" in log.error_message

    def test_triage_input_truncation_to_4000_chars(self):
        service = GroqService(api_key="test-api-key")
        user = UserFactory()
        giant_input = "A" * 6000

        mock_resp = MagicMock()
        mock_resp.choices[0].message.content = """{
            "title": "Truncated input test",
            "type": "task",
            "priority": "low",
            "severity": "trivial",
            "steps_to_reproduce": [],
            "expected_behavior": "",
            "actual_behavior": "",
            "suggested_labels": [],
            "possible_root_cause": "",
            "confidence": 0.5,
            "reasoning": "Truncated"
        }"""
        mock_resp.usage.prompt_tokens = 50
        mock_resp.usage.completion_tokens = 20

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.chat.completions.create.return_value = mock_resp
            mock_get_client.return_value = mock_client

            service.triage_issue(raw_text=giant_input, project_labels=[], user=user)

            call_args = mock_client.chat.completions.create.call_args[1]
            contents_sent = call_args["messages"][1]["content"]
            # Raw text sent should have at most 4000 'A' characters inside untrusted block
            assert "A" * 4001 not in contents_sent
            assert "A" * 4000 in contents_sent

    def test_missing_api_key_raises_service_unavailable(self):
        service = GroqService(api_key="")
        with pytest.raises(AIServiceUnavailable):
            service.triage_issue(raw_text="Test bug", project_labels=[])


@pytest.mark.django_db
class TestGroqSummary:
    def test_summarize_issue_success(self):
        service = GroqService(api_key="test-api-key")
        user = UserFactory()

        mock_resp = MagicMock()
        mock_resp.choices[0].message.content = """{
            "tldr": "Crash on checkout due to missing Stripe API key in staging environment.",
            "status": "Awaiting secret configuration update from DevOps team.",
            "open_questions": ["Is production affected as well?"],
            "next_steps": ["Deploy updated .env to staging", "Verify checkout flow with test card"]
        }"""
        mock_resp.usage.prompt_tokens = 180
        mock_resp.usage.completion_tokens = 70

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.chat.completions.create.return_value = mock_resp
            mock_get_client.return_value = mock_client

            summary = service.summarize_issue(
                key="PROJ-42",
                title="Checkout crashes with 500 error",
                status="in_progress",
                priority="urgent",
                description="When clicking place order, spinner spins forever and 500 returned",
                comments=[{"author_name": "Alice", "body": "Checked logs, Stripe secret missing"}],
                activities=[{"actor_name": "Bob", "verb": "status_changed", "field": "status"}],
                user=user,
            )

            assert "Crash on checkout" in summary.tldr
            assert len(summary.open_questions) == 1
            assert len(summary.next_steps) == 2


@pytest.mark.django_db
class TestDuplicateDetectionService:
    def test_python_trigram_similarity_math(self):
        s1 = "Crash on login button click"
        s2 = "Crash on login button tap"
        sim = python_trigram_similarity(s1, s2)
        assert sim > 0.65

    def test_duplicate_detection_project_scoping_and_ordering(self):
        project1 = ProjectFactory()
        project2 = ProjectFactory()
        user = project1.owner

        issue1 = IssueFactory(
            project=project1,
            title="App crashes when login button pressed",
            reporter=user,
        )
        IssueFactory(
            project=project1,
            title="App crashes when login button is pressed",
            reporter=user,
        )
        IssueFactory(
            project=project1,
            title="Completely unrelated dark mode styling issue",
            reporter=user,
        )

        # An exact matching title in another project must never leak into results.
        issue_other_proj = IssueFactory(
            project=project2,
            title="App crashes when login button pressed",
            reporter=project2.owner,
        )
        results = find_duplicate_issues(
            project=project1,
            title="App crashes when login button pressed",
            threshold=0.4,
            user=user,
        )

        returned_ids = [r["id"] for r in results]
        assert str(issue_other_proj.id) not in returned_ids
        assert str(issue1.id) in returned_ids
        assert all(results[index]["similarity"] >= results[index + 1]["similarity"] for index in range(len(results) - 1))

    def test_duplicate_detection_uses_trigram_similarity(self):
        project = ProjectFactory()
        user = project.owner

        issue = IssueFactory(
            project=project,
            title="Payment webhook returns 500 internal server error",
            reporter=user,
        )

        results = find_duplicate_issues(
            project=project,
            title="Payment webhook returns 500 internal server error",
            threshold=0.70,
            user=user,
        )

        assert len(results) >= 1
        assert results[0]["id"] == str(issue.id)
        assert results[0]["similarity"] >= 0.70
