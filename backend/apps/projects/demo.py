"""Ephemeral demo workspace provisioning with realistic small-team sample data."""

import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.issues.models import (
    IssuePriority,
    IssueSeverity,
    IssueSource,
    IssueStatus,
    IssueType,
    Label,
)
from apps.issues.services import create_comment, create_issue, link_pull_request
from apps.projects.models import Membership, RoleChoices
from apps.projects.services import create_project
from apps.users.services import get_tokens_for_user

User = get_user_model()


def create_demo_workspace_session() -> tuple[User, dict[str, str], dict]:
    """
    Creates an isolated demo user & sample engineering project ('ACME Checkout')
    so visitors can explore Inbox, Capture, Today, Board, and Issue Detail without signup.
    """
    suffix = uuid.uuid4().hex[:8]

    with transaction.atomic():
        demo_user = User.objects.create_user(
            email=f"alex+{suffix}@demo.bugsense.app",
            password=None,
            full_name="Alex Chen",
            last_active_at=timezone.now(),
        )
        teammate_1 = User.objects.create_user(
            email=f"maya+{suffix}@demo.bugsense.app",
            password=None,
            full_name="Maya Patel",
            last_active_at=timezone.now() - timedelta(minutes=18),
        )
        teammate_2 = User.objects.create_user(
            email=f"sam+{suffix}@demo.bugsense.app",
            password=None,
            full_name="Sam Rivera",
            last_active_at=timezone.now() - timedelta(hours=3),
        )

        project_key = f"DM{suffix[:4].upper()}"
        project = create_project(
            user=demo_user,
            name="Acme Checkout",
            key=project_key,
            description="Sample small-team bug inbox & billing service workspace.",
            is_demo=True,
        )
        project.triage_rotation_enabled = True
        project.triage_rotation_cadence = "weekly"
        project.current_triager = demo_user
        project.save(
            update_fields=["triage_rotation_enabled", "triage_rotation_cadence", "current_triager"]
        )

        Membership.objects.create(project=project, user=teammate_1, role=RoleChoices.MEMBER)
        Membership.objects.create(project=project, user=teammate_2, role=RoleChoices.MEMBER)

        lbl_checkout = Label.objects.create(project=project, name="checkout", color="#2563EB")
        lbl_auth = Label.objects.create(project=project, name="auth", color="#7C3AED")
        lbl_perf = Label.objects.create(project=project, name="performance", color="#D97706")

        # Board issues
        i1 = create_issue(
            project=project,
            reporter=teammate_1,
            assignee=demo_user,
            title="Stripe webhook fails signature check when body contains unicode",
            description=(
                "Raw request body was decoded before HMAC verification in `webhooks/stripe.py`."
            ),
            status=IssueStatus.IN_PROGRESS,
            priority=IssuePriority.URGENT,
            severity=IssueSeverity.CRITICAL,
            type=IssueType.BUG,
            labels=[lbl_checkout],
            is_blocking_release=True,
            checklist=[
                {
                    "id": "c1",
                    "text": "Use raw request.body bytes for HMAC verification",
                    "done": True,
                },
                {"id": "c2", "text": "Add regression test with UTF-8 customer name", "done": False},
            ],
        )
        i2 = create_issue(
            project=project,
            reporter=demo_user,
            assignee=teammate_1,
            title="Tax summary flashes $0.00 before shipping address loads",
            description="Observed on Safari 17 when returning from Apple Pay sheet.",
            status=IssueStatus.IN_REVIEW,
            priority=IssuePriority.HIGH,
            severity=IssueSeverity.MAJOR,
            type=IssueType.BUG,
            labels=[lbl_checkout],
        )
        link_pull_request(
            issue=i2,
            pr_number=48,
            title=f"fix({project.key}-{i2.number}): wait for tax quote before rendering summary",
            url=f"https://github.com/acme/checkout/pull/48-{suffix}",
            branch=f"{project.key.lower()}-{i2.number}-tax-summary-flash",
            repo_full_name="acme/checkout",
            state="open",
            ci_status="success",
            actor=teammate_1,
            auto_transition=False,
        )

        create_issue(
            project=project,
            reporter=teammate_2,
            assignee=demo_user,
            title="Retry button on expired magic link does not clear old error toast",
            status=IssueStatus.TODO,
            priority=IssuePriority.HIGH,
            severity=IssueSeverity.MINOR,
            type=IssueType.BUG,
            labels=[lbl_auth],
        )
        create_issue(
            project=project,
            reporter=demo_user,
            assignee=teammate_2,
            title="Invoice PDF export times out for >200 line items",
            status=IssueStatus.IN_PROGRESS,
            priority=IssuePriority.MEDIUM,
            severity=IssueSeverity.MAJOR,
            type=IssueType.PERFORMANCE
            if hasattr(IssueType, "PERFORMANCE")
            else IssueType.IMPROVEMENT,
            labels=[lbl_perf],
        )
        create_issue(
            project=project,
            reporter=demo_user,
            assignee=teammate_1,
            title="Show VAT ID validation error inline instead of toast",
            status=IssueStatus.DONE,
            priority=IssuePriority.LOW,
            severity=IssueSeverity.MINOR,
            type=IssueType.IMPROVEMENT,
            external_reporter_name="Priya (Customer Success)",
            external_reporter_email="priya@customer.example",
        )

        # Inbox untriaged reports
        create_issue(
            project=project,
            reporter=demo_user,
            title="TypeError: Cannot read properties of undefined (reading 'map') in InvoiceList",
            description=(
                "Reported in #support-bugs: Customer opened /invoices with an empty "
                "billing period and saw a white screen."
            ),
            status=IssueStatus.INBOX,
            priority=IssuePriority.HIGH,
            severity=IssueSeverity.MAJOR,
            source=IssueSource.SLACK,
            external_reporter_name="QA Bot",
        )
        create_issue(
            project=project,
            reporter=demo_user,
            title="Webhook HMAC signature mismatch on customer names with accents",
            description=(
                "Sentry spike: 14 events in production over the last hour on `/api/stripe/webhook`."
            ),
            status=IssueStatus.INBOX,
            priority=IssuePriority.URGENT,
            severity=IssueSeverity.CRITICAL,
            source=IssueSource.SENTRY,
            ai_metadata={
                "possible_duplicates": [
                    {
                        "id": str(i1.id),
                        "number": i1.number,
                        "key": i1.key,
                        "title": i1.title,
                        "status": i1.status,
                        "similarity": 0.84,
                    }
                ],
                "suggested_assignee": {
                    "id": str(demo_user.id),
                    "full_name": demo_user.full_name,
                    "email": demo_user.email,
                    "reason": "Working on related webhook issue",
                },
            },
        )
        create_issue(
            project=project,
            reporter=demo_user,
            title="Receipt PDF shows UTC timestamp instead of billing timezone",
            description=(
                "Forwarded from support@acme.test: Customers in PST see tomorrow's "
                "date on midnight invoices."
            ),
            status=IssueStatus.INBOX,
            priority=IssuePriority.MEDIUM,
            severity=IssueSeverity.MINOR,
            source=IssueSource.EMAIL,
            external_reporter_name="Elena",
            external_reporter_email="elena@example.com",
        )

        create_comment(
            issue=i1,
            author=teammate_1,
            body=(
                f"Hey @{demo_user.email.split('@')[0]}, reproduced this locally "
                "with `José García` as customer name!"
            ),
        )

    tokens = get_tokens_for_user(demo_user)
    return demo_user, tokens, {"id": str(project.id), "key": project.key, "name": project.name}
