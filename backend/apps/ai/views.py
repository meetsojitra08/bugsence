from datetime import datetime

from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.serializers import (
    AIDuplicateItemSerializer,
    AIDuplicatesRequestSerializer,
    AISummarizeRequestSerializer,
    AISummaryResponseSerializer,
    AITriageRequestSerializer,
    AITriageResponseSerializer,
)
from apps.ai.services.duplicates import find_duplicate_issues
from apps.ai.services.fallback import (
    compute_missing_info,
    heuristic_triage,
    suggest_assignee_for_report,
)
from apps.ai.services.groq import AIServiceUnavailable, groq_service
from apps.ai.throttling import AIUserRateThrottle
from apps.issues.models import Issue, Label
from apps.projects.models import Membership, Project


class AITriageView(APIView):
    """
    Analyzes untrusted bug reports, error stack traces or customer complaints
    and automatically extracts structured issue fields (title, priority, severity, steps, etc.).
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [AIUserRateThrottle]

    @extend_schema(
        summary="Auto-triage a raw bug report with Groq AI",
        request=AITriageRequestSerializer,
        responses={
            200: AITriageResponseSerializer,
            400: OpenApiResponse(description="Validation error"),
            403: OpenApiResponse(description="Not a project member"),
            429: OpenApiResponse(description="Rate limit exceeded (20/min)"),
            503: OpenApiResponse(description="AI service unavailable"),
        },
    )
    def post(self, request):
        serializer = AITriageRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data["project_id"]
        raw_text = serializer.validated_data["raw_text"]

        project = get_object_or_404(Project, id=project_id)
        if not Membership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You do not have access to this project.")

        project_labels = list(Label.objects.filter(project=project).values_list("name", flat=True))

        try:
            triage_result = groq_service.triage_issue(
                raw_text=raw_text,
                project_labels=project_labels,
                user=request.user,
            )
        except AIServiceUnavailable:
            # In environments without a configured AI key, fall back to deterministic triage
            # so single-screen capture & inbox auto-triage still operate smoothly.
            from django.conf import settings as django_settings

            if getattr(django_settings, "GROQ_API_KEY", ""):
                raise
            triage_result = heuristic_triage(raw_text, project_labels)

        payload = triage_result.model_dump()
        if not payload.get("missing_info") and payload.get("confidence", 1.0) < 0.75:
            payload["missing_info"] = compute_missing_info(
                raw_text,
                payload.get("steps_to_reproduce") or [],
                payload.get("actual_behavior") or "",
            )
        payload["suggested_assignee"] = suggest_assignee_for_report(
            project=project,
            raw_text=raw_text,
            title=payload.get("title", ""),
        )

        return Response(
            AITriageResponseSerializer(payload).data,
            status=status.HTTP_200_OK,
        )


class AIDuplicatesView(APIView):
    """
    Searches for semantically and lexically similar issues within the same project
    using project-scoped trigram similarity.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [AIUserRateThrottle]

    @extend_schema(
        summary="Search for duplicate or similar issues in a project",
        request=AIDuplicatesRequestSerializer,
        responses={
            200: AIDuplicateItemSerializer(many=True),
            400: OpenApiResponse(description="Validation error"),
            403: OpenApiResponse(description="Not a project member"),
            429: OpenApiResponse(description="Rate limit exceeded"),
        },
    )
    def post(self, request):
        serializer = AIDuplicatesRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data["project_id"]
        title = serializer.validated_data["title"]
        description = serializer.validated_data.get("description", "")
        threshold = serializer.validated_data.get("threshold", 0.80)

        project = get_object_or_404(Project, id=project_id)
        if not Membership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You do not have access to this project.")

        duplicates = find_duplicate_issues(
            project=project,
            title=title,
            description=description,
            threshold=threshold,
            user=request.user,
        )

        return Response(
            AIDuplicateItemSerializer(duplicates, many=True).data,
            status=status.HTTP_200_OK,
        )


class AISummarizeView(APIView):
    """
    Summarizes long issue discussions, descriptions, and activity streams into
    a concise TL;DR, current status, open questions, and recommended next steps.
    Caches the generated summary; detects when new comments make cache stale.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [AIUserRateThrottle]

    @extend_schema(
        summary="Generate or retrieve cached AI summary for an issue",
        request=AISummarizeRequestSerializer,
        responses={
            200: AISummaryResponseSerializer,
            403: OpenApiResponse(description="Not a project member"),
            404: OpenApiResponse(description="Issue not found"),
            429: OpenApiResponse(description="Rate limit exceeded"),
            503: OpenApiResponse(description="AI service unavailable"),
        },
    )
    def post(self, request, issue_id):
        issue = get_object_or_404(Issue, id=issue_id)
        if not Membership.objects.filter(project=issue.project, user=request.user).exists():
            raise PermissionDenied("You do not have access to this project.")

        serializer = AISummarizeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        regenerate = serializer.validated_data.get("regenerate", False)

        ai_metadata = issue.ai_metadata or {}
        cached_summary = ai_metadata.get("summary")
        generated_at_str = ai_metadata.get("summary_generated_at")

        # Determine staleness based on latest comments
        is_stale = ai_metadata.get("summary_stale", False)
        latest_comment = issue.comments.order_by("-created_at").first()

        parsed_generated_at: datetime | None = None
        if generated_at_str:
            parsed_generated_at = parse_datetime(generated_at_str)

        if parsed_generated_at and latest_comment:
            if latest_comment.created_at > parsed_generated_at:
                is_stale = True

        # Return cached summary if valid and not forcing regeneration
        if not regenerate and cached_summary and not is_stale:
            return Response(
                {
                    "tldr": cached_summary.get("tldr", issue.ai_summary),
                    "status": cached_summary.get("status", "Active"),
                    "open_questions": cached_summary.get("open_questions", []),
                    "next_steps": cached_summary.get("next_steps", []),
                    "is_stale": False,
                    "generated_at": generated_at_str,
                },
                status=status.HTTP_200_OK,
            )

        # Build context from comments and recent activity
        comments_qs = list(
            issue.comments.order_by("created_at")[:20].values(
                "body",
                author_name=F("author__full_name"),
                author_email=F("author__email"),
            )
        )
        activities_qs = list(
            issue.activities.order_by("-created_at")[:10].values(
                "verb",
                "field",
                "old_value",
                "new_value",
                actor_name=F("actor__full_name"),
            )
        )

        summary_response = groq_service.summarize_issue(
            key=issue.key,
            title=issue.title,
            status=issue.status,
            priority=issue.priority,
            description=issue.description,
            comments=comments_qs,
            activities=activities_qs,
            user=request.user,
        )

        # Update cache on Issue model
        now_iso = timezone.now().isoformat()
        issue.ai_summary = summary_response.tldr
        ai_metadata["summary"] = summary_response.model_dump()
        ai_metadata["summary_generated_at"] = now_iso
        ai_metadata["summary_stale"] = False
        issue.ai_metadata = ai_metadata
        issue.save(update_fields=["ai_summary", "ai_metadata", "updated_at"])

        return Response(
            {
                "tldr": summary_response.tldr,
                "status": summary_response.status,
                "open_questions": summary_response.open_questions,
                "next_steps": summary_response.next_steps,
                "is_stale": False,
                "generated_at": now_iso,
            },
            status=status.HTTP_200_OK,
        )
