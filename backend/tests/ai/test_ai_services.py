from unittest.mock import MagicMock, patch

import pytest
from rest_framework.exceptions import APIException

from apps.ai.models import AIRequestLog, AIRequestLogKind
from apps.ai.services.duplicates import (
    find_duplicate_issues,
    python_cosine_similarity,
    python_trigram_similarity,
)
from apps.ai.services.gemini import AIServiceUnavailable, AITimeoutError, GeminiService
from tests.factories import IssueFactory, ProjectFactory, UserFactory


@pytest.mark.django_db
class TestGeminiTriageService:
    def test_triage_issue_success(self):
        service = GeminiService(api_key="test-api-key")
        user = UserFactory()

        mock_response = MagicMock()
        mock_response.text = """{
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
        mock_response.usage_metadata.prompt_token_count = 120
        mock_response.usage_metadata.candidates_token_count = 60

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_response
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
        service = GeminiService(api_key="test-api-key")
        user = UserFactory()

        # First call returns invalid JSON, second call returns valid JSON
        mock_bad_resp = MagicMock()
        mock_bad_resp.text = "This is not valid json {"
        mock_bad_resp.usage_metadata.prompt_token_count = 100
        mock_bad_resp.usage_metadata.candidates_token_count = 20

        mock_good_resp = MagicMock()
        mock_good_resp.text = """{
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
        mock_good_resp.usage_metadata.prompt_token_count = 110
        mock_good_resp.usage_metadata.candidates_token_count = 50

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.generate_content.side_effect = [mock_bad_resp, mock_good_resp]
            mock_get_client.return_value = mock_client

            result = service.triage_issue(
                raw_text="Some error report",
                project_labels=[],
                user=user,
            )

            assert result.title == "Recovered from retry"
            assert mock_client.models.generate_content.call_count == 2

            log = AIRequestLog.objects.filter(user=user, kind=AIRequestLogKind.TRIAGE).first()
            assert log is not None
            assert log.success is True
            assert log.tokens_in == 210

    def test_triage_timeout_raises_ai_timeout_error(self):
        service = GeminiService(api_key="test-api-key")
        user = UserFactory()

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.generate_content.side_effect = TimeoutError("Deadline exceeded")
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
        service = GeminiService(api_key="test-api-key")
        user = UserFactory()
        giant_input = "A" * 6000

        mock_resp = MagicMock()
        mock_resp.text = """{
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
        mock_resp.usage_metadata.prompt_token_count = 50
        mock_resp.usage_metadata.candidates_token_count = 20

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_resp
            mock_get_client.return_value = mock_client

            service.triage_issue(raw_text=giant_input, project_labels=[], user=user)

            call_args = mock_client.models.generate_content.call_args[1]
            contents_sent = call_args["contents"]
            # Raw text sent should have at most 4000 'A' characters inside untrusted block
            assert "A" * 4001 not in contents_sent
            assert "A" * 4000 in contents_sent

    def test_missing_api_key_raises_service_unavailable(self):
        service = GeminiService(api_key="")
        with pytest.raises(AIServiceUnavailable):
            service.triage_issue(raw_text="Test bug", project_labels=[])


@pytest.mark.django_db
class TestGeminiEmbeddingAndSummary:
    def test_generate_embedding_success(self):
        service = GeminiService(api_key="test-api-key")
        user = UserFactory()

        fake_vector = [0.1] * 768
        mock_embed_resp = MagicMock()
        mock_item = MagicMock()
        mock_item.values = fake_vector
        mock_embed_resp.embeddings = [mock_item]

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.embed_content.return_value = mock_embed_resp
            mock_get_client.return_value = mock_client

            result = service.generate_embedding("Test issue description", user=user)
            assert result == fake_vector

            log = AIRequestLog.objects.filter(user=user, kind=AIRequestLogKind.EMBEDDING).first()
            assert log is not None
            assert log.success is True

    def test_generate_embedding_handles_failure_gracefully(self):
        service = GeminiService(api_key="test-api-key")
        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.embed_content.side_effect = APIException("Quota exceeded")
            mock_get_client.return_value = mock_client

            result = service.generate_embedding("Failure test")
            assert result is None

    def test_summarize_issue_success(self):
        service = GeminiService(api_key="test-api-key")
        user = UserFactory()

        mock_resp = MagicMock()
        mock_resp.text = """{
            "tldr": "Crash on checkout due to missing Stripe API key in staging environment.",
            "status": "Awaiting secret configuration update from DevOps team.",
            "open_questions": ["Is production affected as well?"],
            "next_steps": ["Deploy updated .env to staging", "Verify checkout flow with test card"]
        }"""
        mock_resp.usage_metadata.prompt_token_count = 180
        mock_resp.usage_metadata.candidates_token_count = 70

        with patch.object(service, "_get_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_resp
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
    def test_python_vector_similarity_math(self):
        v1 = [1.0, 0.0, 0.0]
        v2 = [1.0, 0.0, 0.0]
        v3 = [0.0, 1.0, 0.0]

        assert python_cosine_similarity(v1, v2) == 1.0
        assert python_cosine_similarity(v1, v3) == 0.0

    def test_python_trigram_similarity_math(self):
        s1 = "Crash on login button click"
        s2 = "Crash on login button tap"
        sim = python_trigram_similarity(s1, s2)
        assert sim > 0.65

    def test_duplicate_detection_project_scoping_and_ordering(self):
        project1 = ProjectFactory()
        project2 = ProjectFactory()
        user = project1.owner

        # Create issues with dense embeddings in project1
        vec_base = [0.1] * 768
        vec_similar = [0.101] * 768
        vec_unrelated = [-0.1] * 768

        issue1 = IssueFactory(
            project=project1,
            title="App crashes when login button pressed",
            reporter=user,
        )
        issue1.embedding = vec_base
        issue1.save(update_fields=["embedding"])

        issue2 = IssueFactory(
            project=project1,
            title="Slightly different wording crash login",
            reporter=user,
        )
        issue2.embedding = vec_similar
        issue2.save(update_fields=["embedding"])

        issue_unrelated = IssueFactory(
            project=project1,
            title="Completely unrelated dark mode styling issue",
            reporter=user,
        )
        issue_unrelated.embedding = vec_unrelated
        issue_unrelated.save(update_fields=["embedding"])

        # Issue in project2 with identical vector - must NOT leak into project1 results!
        issue_other_proj = IssueFactory(
            project=project2,
            title="App crashes when login button pressed",
            reporter=project2.owner,
        )
        issue_other_proj.embedding = vec_base
        issue_other_proj.save(update_fields=["embedding"])

        with patch("apps.ai.services.duplicates.gemini_service.generate_embedding") as mock_embed:
            mock_embed.return_value = vec_base

            results = find_duplicate_issues(
                project=project1,
                title="App crashes when login button pressed",
                threshold=0.80,
                user=user,
            )

            # Check scoping: issue_other_proj must never appear
            returned_ids = [r["id"] for r in results]
            assert str(issue_other_proj.id) not in returned_ids

            # Check matches found in project1
            assert str(issue1.id) in returned_ids
            assert str(issue2.id) in returned_ids
            # Unrelated issue below threshold must not appear
            assert str(issue_unrelated.id) not in returned_ids

            # Check descending similarity ordering
            assert results[0]["similarity"] >= results[1]["similarity"]

    def test_duplicate_detection_fallback_when_embedding_is_none(self):
        project = ProjectFactory()
        user = project.owner

        issue = IssueFactory(
            project=project,
            title="Payment webhook returns 500 internal server error",
            reporter=user,
        )

        with patch("apps.ai.services.duplicates.gemini_service.generate_embedding") as mock_embed:
            mock_embed.return_value = None

            results = find_duplicate_issues(
                project=project,
                title="Payment webhook returns 500 internal server error",
                threshold=0.70,
                user=user,
            )

            assert len(results) >= 1
            assert results[0]["id"] == str(issue.id)
            assert results[0]["similarity"] >= 0.70
