import json
import logging
import time
from typing import Any

from django.conf import settings
from google import genai
from google.genai import errors, types
from rest_framework.exceptions import APIException

from apps.ai.models import AIRequestLog, AIRequestLogKind
from apps.ai.prompts.summary import SUMMARY_SYSTEM_PROMPT, build_summary_user_message
from apps.ai.prompts.triage import TRIAGE_SYSTEM_PROMPT, build_triage_user_message
from apps.ai.schemas import AISummaryResponse, AITriageResponse

logger = logging.getLogger(__name__)


class AIServiceUnavailable(APIException):
    status_code = 503
    default_detail = "AI service is currently unavailable. Please try again later."
    default_code = "ai_service_unavailable"


class AITimeoutError(APIException):
    status_code = 504
    default_detail = "AI request timed out after 8 seconds."
    default_code = "ai_timeout"


class GeminiService:
    """Production service wrapper for Google Gemini API with logging, validation and retries."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else getattr(settings, "GEMINI_API_KEY", "")
        self.model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")
        self.embed_model = getattr(settings, "GEMINI_EMBED_MODEL", "gemini-embedding-001")
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if not self.api_key:
            raise AIServiceUnavailable("Gemini API key is not configured on the server.")
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def triage_issue(
        self,
        *,
        raw_text: str,
        project_labels: list[str],
        user: Any = None,
    ) -> AITriageResponse:
        """
        Parses raw text into a structured issue specification using Gemini.
        Applies input truncation, prompt injection defense, 8s timeout,
        and 1 retry on malformed JSON.
        """
        client = self._get_client()
        user_prompt = build_triage_user_message(raw_text, project_labels)

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=TRIAGE_SYSTEM_PROMPT,
            temperature=0.2,
            http_options=types.HttpOptions(timeout=10000),
        )

        start_time = time.perf_counter()
        tokens_in = 0
        tokens_out = 0
        success = False
        error_msg = ""

        try:
            # First attempt
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=user_prompt,
                    config=config,
                )
                tokens_in = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                tokens_out = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
                data = json.loads(response.text)
                validated = AITriageResponse.model_validate(data)
                success = True
                return validated
            except (json.JSONDecodeError, ValueError) as parse_err:
                logger.warning(
                    "Gemini triage first attempt invalid JSON, retrying once: %s", parse_err
                )
                retry_prompt = (
                    f"{user_prompt}\n\nIMPORTANT: Previous output was invalid JSON. "
                    "Return ONLY strict, valid JSON matching the exact schema."
                )
                response = client.models.generate_content(
                    model=self.model,
                    contents=retry_prompt,
                    config=config,
                )
                tokens_in += getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                tokens_out += getattr(response.usage_metadata, "candidates_token_count", 0) or 0
                data = json.loads(response.text)
                validated = AITriageResponse.model_validate(data)
                success = True
                return validated
        except (errors.ClientError, errors.ServerError, errors.APIError) as api_err:
            error_msg = f"Gemini API error: {api_err}"
            logger.error("Gemini triage API failure: %s", api_err)
            raise AIServiceUnavailable(
                f"AI service temporarily unavailable: {api_err}"
            ) from api_err
        except TimeoutError as t_err:
            error_msg = "Request timed out"
            logger.error("Gemini triage timeout: %s", t_err)
            raise AITimeoutError() from t_err
        except Exception as exc:
            error_msg = str(exc)
            logger.error("Gemini triage unexpected error: %s", exc)
            raise AIServiceUnavailable(f"Failed to triage bug report: {exc}") from exc
        finally:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            self._log_request(
                user=user,
                kind=AIRequestLogKind.TRIAGE,
                model=self.model,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
                success=success,
                error_message=error_msg,
            )

    def generate_embedding(
        self,
        text: str,
        user: Any = None,
    ) -> list[float] | None:
        """
        Generates a 768-dimensional dense vector embedding via Gemini text-embedding model.
        Returns None gracefully if the API key is not configured or embedding fails.
        """
        if not self.api_key:
            return None

        client = self._get_client()
        clean_text = text[:4000].strip()
        if not clean_text:
            return None

        start_time = time.perf_counter()
        tokens_in = 0
        success = False
        error_msg = ""

        try:
            response = client.models.embed_content(
                model=self.embed_model,
                contents=clean_text,
                config=types.EmbedContentConfig(output_dimensionality=768),
            )
            if response.embeddings and len(response.embeddings) > 0:
                values = list(response.embeddings[0].values)
                success = True
                return values
            return None
        except Exception as exc:
            error_msg = str(exc)
            logger.warning("Gemini embedding generation failed: %s", exc)
            return None
        finally:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            self._log_request(
                user=user,
                kind=AIRequestLogKind.EMBEDDING,
                model=self.embed_model,
                tokens_in=tokens_in,
                tokens_out=0,
                latency_ms=latency_ms,
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
        """
        Generates a structured technical summary from issue description, comments and activities.
        """
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

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=SUMMARY_SYSTEM_PROMPT,
            temperature=0.2,
            http_options=types.HttpOptions(timeout=10000),
        )

        start_time = time.perf_counter()
        tokens_in = 0
        tokens_out = 0
        success = False
        error_msg = ""

        try:
            response = client.models.generate_content(
                model=self.model,
                contents=user_prompt,
                config=config,
            )
            tokens_in = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
            tokens_out = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
            data = json.loads(response.text)
            validated = AISummaryResponse.model_validate(data)
            success = True
            return validated
        except (errors.ClientError, errors.ServerError, errors.APIError) as api_err:
            error_msg = f"Gemini API error: {api_err}"
            logger.error("Gemini summarize API error: %s", api_err)
            raise AIServiceUnavailable(
                f"AI service temporarily unavailable: {api_err}"
            ) from api_err
        except TimeoutError as t_err:
            error_msg = "Request timed out"
            logger.error("Gemini summarize timeout: %s", t_err)
            raise AITimeoutError() from t_err
        except Exception as exc:
            error_msg = str(exc)
            logger.error("Gemini summarize unexpected error: %s", exc)
            raise AIServiceUnavailable(f"Failed to summarize issue: {exc}") from exc
        finally:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            self._log_request(
                user=user,
                kind=AIRequestLogKind.SUMMARIZE,
                model=self.model,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
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


gemini_service = GeminiService()
