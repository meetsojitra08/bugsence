import json
import logging
import time
from typing import Any

from django.conf import settings
from groq import Groq
from rest_framework.exceptions import APIException

from apps.ai.models import AIRequestLog, AIRequestLogKind
from apps.ai.prompts.summary import SUMMARY_SYSTEM_PROMPT, build_summary_user_message
from apps.ai.prompts.triage import TRIAGE_SYSTEM_PROMPT, build_triage_user_message
from apps.ai.schemas import AISummaryResponse, AITriageResponse

logger = logging.getLogger(__name__)

TRIAGE_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "type": {"type": "string", "enum": ["bug", "feature", "task", "improvement"]},
        "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
        "severity": {"type": "string", "enum": ["trivial", "minor", "major", "critical"]},
        "steps_to_reproduce": {"type": "array", "items": {"type": "string"}},
        "expected_behavior": {"type": "string"},
        "actual_behavior": {"type": "string"},
        "suggested_labels": {"type": "array", "items": {"type": "string"}},
        "possible_root_cause": {"type": "string"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "reasoning": {"type": "string"},
    },
    "required": [
        "title", "type", "priority", "severity", "steps_to_reproduce",
        "expected_behavior", "actual_behavior", "suggested_labels",
        "possible_root_cause", "confidence", "reasoning",
    ],
    "additionalProperties": False,
}

SUMMARY_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "tldr": {"type": "string"},
        "status": {"type": "string"},
        "open_questions": {"type": "array", "items": {"type": "string"}},
        "next_steps": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["tldr", "status", "open_questions", "next_steps"],
    "additionalProperties": False,
}


class AIServiceUnavailable(APIException):
    status_code = 503
    default_detail = "AI service is currently unavailable. Please try again later."
    default_code = "ai_service_unavailable"


class AITimeoutError(APIException):
    status_code = 504
    default_detail = "AI request timed out. Please retry."
    default_code = "ai_timeout"


class GroqService:
    """Groq chat-completions wrapper for structured triage and issue summaries."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else getattr(settings, "GROQ_API_KEY", "")
        self.model = getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b")
        self.fallback_model = getattr(settings, "GROQ_FALLBACK_MODEL", "openai/gpt-oss-20b")
        self._client: Groq | None = None

    def _get_client(self) -> Groq:
        if not self.api_key:
            raise AIServiceUnavailable("Groq API key is not configured on the server.")
        if self._client is None:
            self._client = Groq(api_key=self.api_key, timeout=25.0, max_retries=0)
        return self._client

    def _complete_json(
        self,
        client: Groq,
        *,
        system_prompt: str,
        user_prompt: str,
        schema_name: str,
        response_schema: dict[str, Any],
    ) -> tuple[str, str, int, int]:
        """Request schema-constrained JSON and fall back on transient errors."""
        models = [self.model]
        if self.fallback_model and self.fallback_model != self.model:
            models.append(self.fallback_model)

        for index, model in enumerate(models):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": schema_name,
                            "strict": True,
                            "schema": response_schema,
                        },
                    },
                    reasoning_effort="low",
                )
                choice = response.choices[0]
                content = choice.message.content
                if not content:
                    raise ValueError(
                        f"Groq returned an empty response (finish_reason={choice.finish_reason})."
                    )
                usage = response.usage
                return (
                    content,
                    model,
                    getattr(usage, "prompt_tokens", 0) or 0,
                    getattr(usage, "completion_tokens", 0) or 0,
                )
            except Exception as exc:
                status_code = getattr(exc, "status_code", None)
                is_transient = status_code in (408, 429, 500, 502, 503, 504)
                if not is_transient or index == len(models) - 1:
                    raise
                logger.warning(
                    "Groq model %s returned status %s; retrying with %s.",
                    model,
                    status_code,
                    models[index + 1],
                )
                time.sleep(0.25)

        raise AIServiceUnavailable("Groq service is temporarily unavailable.")

    def triage_issue(
        self,
        *,
        raw_text: str,
        project_labels: list[str],
        user: Any = None,
    ) -> AITriageResponse:
        """Parse a bug report into validated issue fields using Groq."""
        client = self._get_client()
        user_prompt = build_triage_user_message(raw_text, project_labels)
        start_time = time.perf_counter()
        tokens_in = 0
        tokens_out = 0
        success = False
        error_msg = ""
        model_used = self.model

        try:
            try:
                content, model_used, tokens_in, tokens_out = self._complete_json(
                    client,
                    system_prompt=TRIAGE_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    schema_name="bug_triage",
                    response_schema=TRIAGE_RESPONSE_SCHEMA,
                )
                result = AITriageResponse.model_validate(json.loads(content))
            except (json.JSONDecodeError, ValueError) as parse_err:
                logger.warning("Groq triage returned invalid JSON; retrying once: %s", parse_err)
                retry_prompt = (
                    f"{user_prompt}\n\nReturn ONLY a valid JSON object matching the exact "
                    "schema. Include every required key and use empty values where information "
                    "is absent."
                )
                content, model_used, retry_in, retry_out = self._complete_json(
                    client,
                    system_prompt=TRIAGE_SYSTEM_PROMPT,
                    user_prompt=retry_prompt,
                    schema_name="bug_triage",
                    response_schema=TRIAGE_RESPONSE_SCHEMA,
                )
                tokens_in += retry_in
                tokens_out += retry_out
                result = AITriageResponse.model_validate(json.loads(content))
            success = True
            return result
        except TimeoutError as exc:
            error_msg = str(exc)
            logger.error("Groq triage request timed out: %s", exc)
            raise AITimeoutError() from exc
        except Exception as exc:
            error_msg = str(exc)
            status_code = getattr(exc, "status_code", None)
            logger.exception(
                "Groq triage request failed (model=%s, status=%s, type=%s).",
                model_used,
                status_code,
                type(exc).__name__,
            )
            if "timeout" in type(exc).__name__.lower():
                raise AITimeoutError() from exc
            if status_code in (401, 403):
                raise AIServiceUnavailable(
                    "Groq authentication failed. Check the server GROQ_API_KEY and model access."
                ) from exc
            if status_code == 429:
                raise AIServiceUnavailable(
                    "Groq rate limit or quota reached. Check the Groq project limits and retry."
                ) from exc
            if status_code in (400, 404, 422):
                raise AIServiceUnavailable(
                    "Groq rejected the model request. Check GROQ_MODEL and the backend log for details."
                ) from exc
            raise AIServiceUnavailable("Groq could not triage this report right now.") from exc
        finally:
            self._log_request(
                user=user,
                kind=AIRequestLogKind.TRIAGE,
                model=model_used,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=int((time.perf_counter() - start_time) * 1000),
                success=success,
                error_message=error_msg,
            )

    def summarize_issue(
        self,
        *,
        key: str,
        title: str,
        status: str,
        priority: str,
        description: str,
        comments: list[dict],
        activities: list[dict],
        user: Any = None,
    ) -> AISummaryResponse:
        """Summarize an issue thread into a validated JSON response using Groq."""
        client = self._get_client()
        user_prompt = build_summary_user_message(
            key=key,
            title=title,
            status=status,
            priority=priority,
            description=description,
            comments=comments,
            activities=activities,
        )
        start_time = time.perf_counter()
        tokens_in = 0
        tokens_out = 0
        success = False
        error_msg = ""
        model_used = self.model

        try:
            content, model_used, tokens_in, tokens_out = self._complete_json(
                client,
                system_prompt=SUMMARY_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                schema_name="issue_summary",
                response_schema=SUMMARY_RESPONSE_SCHEMA,
            )
            result = AISummaryResponse.model_validate(json.loads(content))
            success = True
            return result
        except TimeoutError as exc:
            error_msg = str(exc)
            logger.error("Groq summary request timed out: %s", exc)
            raise AITimeoutError() from exc
        except Exception as exc:
            error_msg = str(exc)
            status_code = getattr(exc, "status_code", None)
            logger.exception(
                "Groq summary request failed (model=%s, status=%s, type=%s).",
                model_used,
                status_code,
                type(exc).__name__,
            )
            if "timeout" in type(exc).__name__.lower():
                raise AITimeoutError() from exc
            if status_code in (401, 403):
                raise AIServiceUnavailable(
                    "Groq authentication failed. Check the server GROQ_API_KEY and model access."
                ) from exc
            if status_code == 429:
                raise AIServiceUnavailable(
                    "Groq rate limit or quota reached. Check the Groq project limits and retry."
                ) from exc
            if status_code in (400, 404, 422):
                raise AIServiceUnavailable(
                    "Groq rejected the model request. Check GROQ_MODEL and the backend log for details."
                ) from exc
            raise AIServiceUnavailable("Groq could not summarize this issue right now.") from exc
        finally:
            self._log_request(
                user=user,
                kind=AIRequestLogKind.SUMMARIZE,
                model=model_used,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=int((time.perf_counter() - start_time) * 1000),
                success=success,
                error_message=error_msg,
            )

    def _log_request(
        self,
        *,
        user: Any,
        kind: str,
        model: str,
        tokens_in: int,
        tokens_out: int,
        latency_ms: int,
        success: bool,
        error_message: str,
    ) -> None:
        try:
            AIRequestLog.objects.create(
                user=user if getattr(user, "is_authenticated", False) else None,
                kind=kind,
                model=model,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
                success=success,
                error_message=error_message[:1000],
            )
        except Exception as exc:
            logger.warning("Failed to record AIRequestLog: %s", exc)


groq_service = GroqService()
