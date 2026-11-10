"""Project integrations config and inbound webhooks (GitHub, Slack, Email, Sentry, Public Form)."""

import hashlib
import hmac
import re
import secrets
import time
from uuid import UUID

from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.ai.services.duplicates import find_duplicate_issues
from apps.ai.services.fallback import heuristic_triage
from apps.ai.services.groq import AIServiceUnavailable, groq_service
from apps.issues.models import Issue, IssuePriority, IssueSeverity, IssueSource, IssueStatus, Label
from apps.issues.services import create_comment, create_issue, link_pull_request
from apps.projects.models import IntegrationProvider, Project, ProjectIntegration, RoleChoices
from apps.projects.selectors import get_project_for_user, get_user_role_in_project
from apps.projects.serializers import (
    ProjectIntegrationSerializer,
    ProjectIntegrationUpdateSerializer,
)


def _get_or_init_integrations(project: Project) -> list[ProjectIntegration]:
    defaults = {
        IntegrationProvider.GITHUB: {
            "enabled": False,
            "config": {"repo_full_name": "", "auto_close_on_merge": True},
        },
        IntegrationProvider.SLACK: {
            "enabled": False,
            "config": {
                "webhook_url": "",
                "channel_name": "#bugs",
                "notify_on_assign": True,
                "notify_on_resolve": True,
            },
        },
        IntegrationProvider.EMAIL_IN: {
            "enabled": True,
            "config": {
                "inbound_address": f"bugs@{project.key.lower()}.bugsense.app",
                "relay_note": (
                    "Point an inbound mail parser (Postmark/Mailgun/SendGrid) "
                    "to this webhook with X-Webhook-Secret."
                ),
            },
        },
        IntegrationProvider.SENTRY: {
            "enabled": False,
            "config": {"auto_deduplicate": True},
        },
        IntegrationProvider.PUBLIC_FORM: {
            "enabled": True,
            "config": {"welcome_message": "Report a bug directly to the engineering inbox."},
        },
    }

    records = []
    for provider, spec in defaults.items():
        obj, created = ProjectIntegration.objects.get_or_create(
            project=project,
            provider=provider,
            defaults={
                "enabled": spec["enabled"],
                "config": spec["config"],
                "webhook_secret": secrets.token_hex(16),
            },
        )
        if not created and not obj.webhook_secret:
            obj.webhook_secret = secrets.token_hex(16)
            obj.save(update_fields=["webhook_secret"])
        records.append(obj)
    return records


def _get_integration_or_forbid(project: Project, provider: str) -> ProjectIntegration:
    _get_or_init_integrations(project)
    integration = ProjectIntegration.objects.get(project=project, provider=provider)
    if not integration.enabled:
        raise PermissionDenied(f"{provider.replace('_', ' ').title()} integration is disabled.")
    return integration


def _extract_bearer_or_secret(request: Request) -> str:
    header_secret = (request.META.get("HTTP_X_WEBHOOK_SECRET") or "").strip()
    if header_secret:
        return header_secret
    auth = (request.META.get("HTTP_AUTHORIZATION") or "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    data = request.data if isinstance(request.data, dict) else {}
    return str(data.get("secret") or data.get("token") or "").strip()


def _verify_shared_secret(request: Request, integration: ProjectIntegration) -> None:
    expected = (integration.webhook_secret or "").strip()
    if not expected:
        raise PermissionDenied("Webhook secret not configured.")
    supplied = _extract_bearer_or_secret(request)
    if not supplied or not hmac.compare_digest(expected, supplied):
        raise PermissionDenied("Missing or invalid webhook secret.")


def _verify_github_signature(request: Request, integration: ProjectIntegration) -> None:
    secret = (integration.webhook_secret or "").strip()
    if not secret:
        raise PermissionDenied("GitHub webhook secret not configured.")
    sig_header = (request.META.get("HTTP_X_HUB_SIGNATURE_256") or "").strip()
    if not sig_header.startswith("sha256="):
        raise PermissionDenied("Missing GitHub X-Hub-Signature-256 header.")
    expected = (
        "sha256="
        + hmac.new(
            secret.encode("utf-8"),
            request.body,
            hashlib.sha256,
        ).hexdigest()
    )
    if not hmac.compare_digest(expected, sig_header):
        raise PermissionDenied("Invalid GitHub webhook signature.")


def _verify_slack_signature(request: Request, integration: ProjectIntegration) -> None:
    secret = (integration.webhook_secret or "").strip()
    if not secret:
        raise PermissionDenied("Slack webhook secret not configured.")
    slack_sig = (request.META.get("HTTP_X_SLACK_SIGNATURE") or "").strip()
    slack_ts = (request.META.get("HTTP_X_SLACK_REQUEST_TIMESTAMP") or "").strip()
    if slack_sig and slack_ts:
        try:
            ts_int = int(slack_ts)
        except ValueError as exc:
            raise PermissionDenied("Invalid Slack request timestamp.") from exc
        if abs(time.time() - ts_int) > 300:
            raise PermissionDenied("Expired Slack request timestamp.")
        base = f"v0:{slack_ts}:".encode() + request.body
        expected = "v0=" + hmac.new(secret.encode("utf-8"), base, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, slack_sig):
            raise PermissionDenied("Invalid Slack signature.")
        return

    # Allow X-Webhook-Secret / Bearer / Slack verification token fallback
    _verify_shared_secret(request, integration)


def _verify_sentry_signature(request: Request, integration: ProjectIntegration) -> None:
    secret = (integration.webhook_secret or "").strip()
    if not secret:
        raise PermissionDenied("Sentry webhook secret not configured.")
    sentry_sig = (request.META.get("HTTP_SENTRY_HOOK_SIGNATURE") or "").strip()
    if sentry_sig:
        expected = hmac.new(
            secret.encode("utf-8"),
            request.body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sentry_sig):
            raise PermissionDenied("Invalid Sentry webhook signature.")
        return

    _verify_shared_secret(request, integration)


def _ingest_to_inbox(
    *,
    project: Project,
    raw_text: str,
    title: str = "",
    source: str,
    external_reporter_name: str = "",
    external_reporter_email: str = "",
    external_ref: str = "",
    environment: str = "",
) -> Issue:
    """Runs optional AI triage (with deterministic fallback) and files into Inbox."""
    project_labels = list(Label.objects.filter(project=project).values_list("name", flat=True))
    rules = project.ai_priority_rules if isinstance(project.ai_priority_rules, dict) else {}
    default_priority = str(rules.get("default_priority") or IssuePriority.MEDIUM).lower()
    if default_priority not in IssuePriority.values:
        default_priority = IssuePriority.MEDIUM

    triage_title = title.strip()[:255]
    priority = default_priority
    severity = IssueSeverity.MINOR
    issue_type = "bug"
    steps = ""
    actual = ""
    ai_meta: dict = {}

    if project.ai_auto_triage and raw_text.strip():
        try:
            res = groq_service.triage_issue(
                raw_text=raw_text,
                project_labels=project_labels,
                user=project.owner,
            )
        except (AIServiceUnavailable, Exception):
            res = heuristic_triage(raw_text, project_labels)

        if not triage_title:
            triage_title = res.title
        if res.confidence >= project.ai_confidence_threshold:
            priority = res.priority
        severity = res.severity
        issue_type = res.type
        steps = "\n".join(res.steps_to_reproduce)
        actual = res.actual_behavior

        urgent_keywords = [
            str(k).strip().lower() for k in (rules.get("urgent_keywords") or []) if str(k).strip()
        ]
        combined_text = f"{triage_title}\n{raw_text}".lower()
        if urgent_keywords and any(kw in combined_text for kw in urgent_keywords):
            priority = IssuePriority.URGENT

        ai_meta = {
            "suggested_type": res.type,
            "suggested_priority": res.priority,
            "suggested_labels": res.suggested_labels,
            "triage_confidence": res.confidence,
            "triage_reasoning": res.reasoning,
            "missing_info": res.missing_info,
        }

    return create_issue(
        project=project,
        reporter=project.owner,
        title=triage_title or "Incoming bug report",
        description=raw_text.strip(),
        steps_to_reproduce=steps,
        actual=actual,
        environment=environment,
        status=IssueStatus.INBOX,
        priority=priority,
        severity=severity,
        type=issue_type,
        source=source,
        external_reporter_name=external_reporter_name,
        external_reporter_email=external_reporter_email,
        external_ref=external_ref,
        ai_metadata=ai_meta,
    )


class ProjectIntegrationsListView(APIView):
    """Lists all integration providers configured for a project."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: UUID) -> Response:
        project = get_project_for_user(project_id=project_id, user=request.user)
        if not project:
            raise NotFound("Project not found.")

        records = _get_or_init_integrations(project)
        return Response(ProjectIntegrationSerializer(records, many=True).data)


class ProjectIntegrationDetailView(APIView):
    """Updates configuration or enables/disables an integration provider."""

    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, project_id: UUID, provider: str) -> Response:
        project = get_project_for_user(project_id=project_id, user=request.user)
        if not project:
            raise NotFound("Project not found.")

        role = get_user_role_in_project(project_id=project.id, user=request.user)
        if role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project owners or admins can configure integrations.")

        if provider not in IntegrationProvider.values:
            raise NotFound("Integration provider not found.")

        _get_or_init_integrations(project)
        integration = ProjectIntegration.objects.get(project=project, provider=provider)

        serializer = ProjectIntegrationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "enabled" in data:
            integration.enabled = data["enabled"]
        if "config" in data and isinstance(data["config"], dict):
            merged = dict(integration.config or {})
            merged.update(data["config"])
            integration.config = merged
        if data.get("regenerate_secret"):
            integration.webhook_secret = secrets.token_hex(16)
        integration.save()

        return Response(ProjectIntegrationSerializer(integration).data)


class ProjectIntegrationTestView(APIView):
    """Verifies integration configuration readiness for owners/admins."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, project_id: UUID, provider: str) -> Response:
        project = get_project_for_user(project_id=project_id, user=request.user)
        if not project:
            raise NotFound("Project not found.")

        role = get_user_role_in_project(project_id=project.id, user=request.user)
        if role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project owners or admins can test integrations.")

        if provider not in IntegrationProvider.values:
            raise NotFound("Integration provider not found.")

        _get_or_init_integrations(project)
        integration = ProjectIntegration.objects.get(project=project, provider=provider)

        if not integration.enabled:
            raise ValidationError({"detail": f"Enable {provider.replace('_', ' ')} first."})

        cfg = integration.config or {}
        if provider == IntegrationProvider.SLACK and not (cfg.get("webhook_url") or "").strip():
            raise ValidationError(
                {"webhook_url": "Add a Slack Incoming Webhook URL to enable outbound alerts."}
            )

        return Response(
            {
                "ok": True,
                "provider": provider,
                "message": (
                    f"{provider.replace('_', ' ').title()} is active and signature check is ready."
                ),
            }
        )


class GitHubWebhookView(APIView):
    """Receives GitHub pull_request & CI check webhooks and updates linked issues."""

    permission_classes = [AllowAny]

    def post(self, request: Request, project_key: str) -> Response:
        project = Project.objects.filter(key__iexact=project_key).first()
        if not project:
            raise NotFound("Project not found.")

        integration = _get_integration_or_forbid(project, IntegrationProvider.GITHUB)
        _verify_github_signature(request, integration)

        payload = request.data if isinstance(request.data, dict) else {}
        event_type = request.META.get("HTTP_X_GITHUB_EVENT", "pull_request")

        pr_data = payload.get("pull_request")
        if event_type == "pull_request" and isinstance(pr_data, dict):
            pr_number = int(pr_data.get("number") or 0)
            pr_title = pr_data.get("title") or ""
            pr_body = pr_data.get("body") or ""
            pr_url = pr_data.get("html_url") or ""
            branch = (pr_data.get("head") or {}).get("ref", "")
            repo_name = (payload.get("repository") or {}).get("full_name", "")
            merged = bool(pr_data.get("merged"))
            raw_state = pr_data.get("state", "open")
            pr_state = "merged" if merged else ("closed" if raw_state == "closed" else "open")

            search_blob = f"{branch} {pr_title} {pr_body}"
            numbers = {
                int(num)
                for num in re.findall(rf"\b{re.escape(project.key)}-(\d+)\b", search_blob, re.I)
            }
            if not numbers or not pr_number or not pr_url:
                return Response({"linked": 0, "message": "No matching issue keys found."})

            auto_close = True
            if isinstance(integration.config, dict):
                auto_close = integration.config.get("auto_close_on_merge", True)

            linked_keys = []
            for issue in Issue.objects.filter(project=project, number__in=numbers):
                link_pull_request(
                    issue=issue,
                    pr_number=pr_number,
                    title=pr_title,
                    url=pr_url,
                    branch=branch,
                    repo_full_name=repo_name,
                    state=pr_state,
                    ci_status="success" if merged else "pending",
                    auto_transition=(pr_state != "merged" or auto_close),
                )
                linked_keys.append(issue.key)

            return Response({"linked": len(linked_keys), "issues": linked_keys})

        # CI status / check_run update for an existing PR branch/PR
        if event_type in ("check_run", "status"):
            conclusion = (payload.get("check_run") or {}).get("conclusion") or payload.get(
                "state", ""
            )
            ci_map = {
                "success": "success",
                "failure": "failure",
                "error": "failure",
                "cancelled": "failure",
                "pending": "pending",
            }
            ci_val = ci_map.get(str(conclusion).lower(), "unknown")
            prs = (payload.get("check_run") or {}).get("pull_requests") or []
            updated = 0
            for pr in prs:
                num = pr.get("number")
                if num:
                    from apps.issues.models import PullRequestLink

                    updated += PullRequestLink.objects.filter(
                        issue__project=project, pr_number=num
                    ).update(ci_status=ci_val)
            return Response({"updated_ci": updated})

        return Response({"status": "ignored"})


class SlackCommandWebhookView(APIView):
    """Handles Slack /bug slash commands and Events API ingestion into Inbox."""

    permission_classes = [AllowAny]

    def post(self, request: Request, project_key: str) -> Response:
        project = Project.objects.filter(key__iexact=project_key).first()
        if not project:
            raise NotFound("Project not found.")

        integration = _get_integration_or_forbid(project, IntegrationProvider.SLACK)
        _verify_slack_signature(request, integration)

        data = request.data if isinstance(request.data, dict) else {}

        # Slack Events API challenge
        if data.get("type") == "url_verification" and "challenge" in data:
            return Response({"challenge": data["challenge"]})

        # Events API callback (e.g. reaction_added / app_mention)
        event = data.get("event")
        if isinstance(event, dict):
            text = (event.get("text") or "").strip()
            if not text:
                text = f"Flagged Slack message ({event.get('type', 'reaction')})"
            issue = _ingest_to_inbox(
                project=project,
                raw_text=text,
                source=IssueSource.SLACK,
                external_ref=str(event.get("ts") or ""),
            )
            return Response({"ok": True, "issue_key": issue.key}, status=status.HTTP_201_CREATED)

        # Slash command (/bug <text>)
        text = (data.get("text") or "").strip()
        if not text:
            return Response(
                {"response_type": "ephemeral", "text": "Usage: /bug <describe the issue>"}
            )

        user_name = (data.get("user_name") or "").strip()
        issue = _ingest_to_inbox(
            project=project,
            raw_text=text,
            source=IssueSource.SLACK,
            external_reporter_name=user_name,
        )
        return Response(
            {
                "response_type": "in_channel",
                "text": f"Captured *{issue.key}*: {issue.title} -> sent to Inbox.",
                "issue_key": issue.key,
            },
            status=status.HTTP_201_CREATED,
        )


class EmailInboundWebhookView(APIView):
    """Accepts inbound forwarded email payloads into the project Inbox."""

    permission_classes = [AllowAny]

    def post(self, request: Request, project_key: str) -> Response:
        project = Project.objects.filter(key__iexact=project_key).first()
        if not project:
            raise NotFound("Project not found.")

        integration = _get_integration_or_forbid(project, IntegrationProvider.EMAIL_IN)
        _verify_shared_secret(request, integration)

        data = request.data if isinstance(request.data, dict) else {}
        subject = (data.get("subject") or "").strip()
        body = (data.get("text") or data.get("body-plain") or data.get("body") or "").strip()
        sender = (data.get("from") or data.get("sender") or "").strip()
        sender_name = (data.get("from_name") or "").strip()

        email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", sender)
        sender_email = email_match.group(0) if email_match else ""
        if not sender_name and "<" in sender:
            sender_name = sender.split("<")[0].strip().strip('"')

        if not subject and not body:
            raise ValidationError({"detail": "Email payload must contain subject or text."})

        issue = _ingest_to_inbox(
            project=project,
            title=subject,
            raw_text=body or subject,
            source=IssueSource.EMAIL,
            external_reporter_name=sender_name,
            external_reporter_email=sender_email,
        )
        return Response(
            {"issue_key": issue.key, "id": str(issue.id)}, status=status.HTTP_201_CREATED
        )


class SentryWebhookView(APIView):
    """Ingests Sentry / error tracker webhooks into Inbox with automatic deduplication."""

    permission_classes = [AllowAny]

    def post(self, request: Request, project_key: str) -> Response:
        project = Project.objects.filter(key__iexact=project_key).first()
        if not project:
            raise NotFound("Project not found.")

        integration = _get_integration_or_forbid(project, IntegrationProvider.SENTRY)
        _verify_sentry_signature(request, integration)

        data = request.data if isinstance(request.data, dict) else {}
        sentry_issue = (data.get("data") or {}).get("issue") or data.get("event") or data
        title = (sentry_issue.get("title") or data.get("message") or "Error tracker alert").strip()
        culprit = (sentry_issue.get("culprit") or "").strip()
        fingerprint = str(sentry_issue.get("id") or sentry_issue.get("shortId") or "")
        env = str(
            sentry_issue.get("environment") or (data.get("event") or {}).get("environment") or ""
        )
        web_url = str(sentry_issue.get("web_url") or sentry_issue.get("permalink") or "")

        raw_text = "\n".join(filter(None, [title, culprit, web_url]))

        # Deduplicate by external_ref or high title/body similarity
        existing = None
        if fingerprint:
            existing = Issue.objects.filter(project=project, external_ref=fingerprint).first()
        if not existing:
            matches = find_duplicate_issues(
                project=project, title=title, description=raw_text, threshold=0.85, limit=1
            )
            if matches:
                existing = Issue.objects.filter(id=matches[0]["id"]).first()

        if existing:
            create_comment(
                issue=existing,
                author=project.owner,
                body=f"New error occurrence received via Sentry webhook ({title}).",
            )
            return Response({"deduplicated": True, "issue_key": existing.key})

        issue = _ingest_to_inbox(
            project=project,
            title=title[:255],
            raw_text=raw_text,
            source=IssueSource.SENTRY,
            external_ref=fingerprint,
            environment=env[:255],
        )
        return Response(
            {"deduplicated": False, "issue_key": issue.key, "id": str(issue.id)},
            status=status.HTTP_201_CREATED,
        )


class PublicReportFormView(APIView):
    """Public unauthenticated bug submission form for QA and customers."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_report"

    def get(self, request: Request, project_key: str) -> Response:
        project = Project.objects.filter(key__iexact=project_key, archived=False).first()
        if not project:
            raise NotFound("Project not found.")

        integration = ProjectIntegration.objects.filter(
            project=project,
            provider=IntegrationProvider.PUBLIC_FORM,
        ).first()
        enabled = integration.enabled if integration else True
        welcome = (
            (integration.config or {}).get("welcome_message")
            if integration
            else "Report a bug directly to the engineering inbox."
        )
        return Response(
            {
                "project_name": project.name,
                "project_key": project.key,
                "enabled": enabled,
                "welcome_message": welcome,
            }
        )

    def post(self, request: Request, project_key: str) -> Response:
        project = Project.objects.filter(key__iexact=project_key, archived=False).first()
        if not project:
            raise NotFound("Project not found.")

        integration = ProjectIntegration.objects.filter(
            project=project,
            provider=IntegrationProvider.PUBLIC_FORM,
        ).first()
        if integration and not integration.enabled:
            raise PermissionDenied("Public bug submissions are disabled for this project.")

        data = request.data if isinstance(request.data, dict) else {}
        # Silent honeypot rejection against bots filling hidden anti-spam fields
        if (data.get("website") or data.get("_hp") or "").strip():
            return Response(
                {"message": "Report submitted to the team Inbox."},
                status=status.HTTP_201_CREATED,
            )

        description = (data.get("description") or "").strip()
        title = (data.get("title") or "").strip()
        reporter_name = (data.get("reporter_name") or "").strip()
        reporter_email = (data.get("reporter_email") or "").strip()
        environment = (data.get("environment") or "").strip()

        if not description and not title:
            raise ValidationError({"description": "Please describe the bug you encountered."})

        issue = _ingest_to_inbox(
            project=project,
            title=title,
            raw_text=description or title,
            source=IssueSource.PUBLIC_FORM,
            external_reporter_name=reporter_name,
            external_reporter_email=reporter_email,
            environment=environment[:255],
        )
        return Response(
            {
                "id": str(issue.id),
                "key": issue.key,
                "title": issue.title,
                "message": "Report submitted to the team Inbox.",
            },
            status=status.HTTP_201_CREATED,
        )
