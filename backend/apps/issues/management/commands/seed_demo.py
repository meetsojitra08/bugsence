import logging
from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.issues.models import (
    IssuePriority,
    IssueSeverity,
    IssueStatus,
    IssueType,
    Label,
)
from apps.issues.services import create_comment, create_issue
from apps.projects.models import Membership, Project, RoleChoices

logger = logging.getLogger(__name__)
User = get_user_model()

DEMO_USERS_DATA = [
    {
        "email": "demo@bugsense.dev",
        "full_name": "Demo Recruiter",
        "password": "DemoPassword123!",
        "avatar_url": (
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
            "?w=100&h=100&fit=crop&crop=faces"
        ),
    },
    {
        "email": "sarah.chen@bugsense.dev",
        "full_name": "Sarah Chen",
        "password": "DemoPassword123!",
        "avatar_url": (
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
            "?w=100&h=100&fit=crop&crop=faces"
        ),
    },
    {
        "email": "marcus.vance@bugsense.dev",
        "full_name": "Marcus Vance",
        "password": "DemoPassword123!",
        "avatar_url": (
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
            "?w=100&h=100&fit=crop&crop=faces"
        ),
    },
    {
        "email": "elena.rostova@bugsense.dev",
        "full_name": "Elena Rostova",
        "password": "DemoPassword123!",
        "avatar_url": (
            "https://images.unsplash.com/photo-1517841905240-472988babdf9"
            "?w=100&h=100&fit=crop&crop=faces"
        ),
    },
]

DEMO_PROJECTS_DATA = [
    {
        "name": "BugSense Core Web",
        "key": "BUG",
        "description": (
            "Production bug tracking platform with real-time AI triage and pgvector similarity."
        ),
    },
    {
        "name": "Mobile Client App",
        "key": "MOB",
        "description": "Cross-platform iOS and Android companion client built with React Native.",
    },
]

DEMO_LABELS_DATA = [
    {"name": "frontend", "color": "#3B82F6", "description": "UI components and client state"},
    {"name": "backend", "color": "#10B981", "description": "API endpoints, DB models and queries"},
    {"name": "security", "color": "#EF4444", "description": "Auth, RBAC, XSS and security tokens"},
    {"name": "performance", "color": "#F59E0B", "description": "Query caching and bundle size"},
    {"name": "ai-engine", "color": "#8B5CF6", "description": "Gemini structured outputs"},
    {"name": "ux", "color": "#EC4899", "description": "Design tokens, accessibility and themes"},
]

ISSUES_DATA: list[dict[str, Any]] = [
    {
        "title": "Fix token refresh race condition causing unexpected logouts on concurrent calls",
        "description": (
            "When multiple requests trigger simultaneous 401 token refresh calls, "
            "the secondary requests fail because the refresh token is blacklisted by the first."
        ),
        "steps_to_reproduce": (
            "1. Fire 5 concurrent API requests with an expired access token.\n"
            "2. Observe only first request succeeds."
        ),
        "expected": "Subscribers queue up until first refresh resolves and use the new token.",
        "actual": "Secondary requests hit 401 and redirect user to login.",
        "environment": "Chrome 131, macOS Sonoma",
        "status": IssueStatus.IN_PROGRESS,
        "priority": IssuePriority.URGENT,
        "severity": IssueSeverity.CRITICAL,
        "type": IssueType.BUG,
        "labels": ["security", "frontend"],
        "days_ago": 3,
        "due_in_days": -1,  # Overdue
    },
    {
        "title": "Database connection pool exhaustion during peak AI triage batch queries",
        "description": (
            "High-volume AI triage requests keep PostgreSQL connection open during "
            "Gemini network latency, saturating pool."
        ),
        "steps_to_reproduce": (
            "1. Submit 30 triage requests within 5 seconds.\n2. Monitor active DB connections."
        ),
        "expected": "DB connection released before calling external Gemini API.",
        "actual": "Connection pool timeout 500 errors.",
        "environment": "Production AWS ECS / Neon Postgres",
        "status": IssueStatus.TODO,
        "priority": IssuePriority.HIGH,
        "severity": IssueSeverity.MAJOR,
        "type": IssueType.BUG,
        "labels": ["backend", "performance"],
        "days_ago": 5,
        "due_in_days": 2,
    },
    {
        "title": "Kanban drag-and-drop float positioning collision on 50 consecutive moves",
        "description": (
            "Subdividing float positions without periodic rebalancing causes underflow below 1e-6."
        ),
        "steps_to_reproduce": "1. Drag issue between two items repeatedly 50 times.",
        "expected": "Automatic column rebalancing trigger resets positions to 1000 intervals.",
        "actual": "Positions collapse into duplicate floats causing unstable column sort.",
        "environment": "All modern browsers",
        "status": IssueStatus.IN_REVIEW,
        "priority": IssuePriority.HIGH,
        "severity": IssueSeverity.MAJOR,
        "type": IssueType.BUG,
        "labels": ["backend", "frontend"],
        "days_ago": 7,
        "due_in_days": 1,
    },
    {
        "title": "Gemini structured output JSON truncation on long stack traces",
        "description": (
            "When stack traces exceed 4,000 characters, Gemini stream truncates JSON bracket tag."
        ),
        "steps_to_reproduce": "1. Paste a 15,000 character Java stack trace into triage modal.",
        "expected": "Input sanitized and truncated to 4,000 chars before prompt submission.",
        "actual": "JSONDecodeError in response parser.",
        "environment": "Gemini 2.5 Flash API",
        "status": IssueStatus.DONE,
        "priority": IssuePriority.HIGH,
        "severity": IssueSeverity.MAJOR,
        "type": IssueType.BUG,
        "labels": ["ai-engine", "backend"],
        "days_ago": 10,
        "due_in_days": 0,
    },
    {
        "title": "Missing pgvector HNSW index on issue embedding column slowing duplicate search",
        "description": (
            "Vector cosine distance queries run sequential table scan across 10,000 issues "
            "instead of HNSW index scan."
        ),
        "steps_to_reproduce": "1. Run EXPLAIN ANALYZE on duplicate similarity query.",
        "expected": "Index Scan using issues_embedding_hnsw_idx.",
        "actual": "Seq Scan on issues.",
        "environment": "PostgreSQL 16 with pgvector 0.7",
        "status": IssueStatus.DONE,
        "priority": IssuePriority.MEDIUM,
        "severity": IssueSeverity.MINOR,
        "type": IssueType.IMPROVEMENT,
        "labels": ["ai-engine", "performance"],
        "days_ago": 14,
        "due_in_days": 0,
    },
    {
        "title": "Markdown XSS sanitization bypass via malicious image onerror tag in comments",
        "description": "Raw markdown HTML tags were not being scrubbed before rendering.",
        "steps_to_reproduce": "1. Post comment with img tag containing onerror handler.",
        "expected": "DOMPurify or whitelist sanitizer removes arbitrary script execution.",
        "actual": "Alert executes on mount.",
        "environment": "Production Web App",
        "status": IssueStatus.CLOSED,
        "priority": IssuePriority.URGENT,
        "severity": IssueSeverity.CRITICAL,
        "type": IssueType.BUG,
        "labels": ["security", "frontend"],
        "days_ago": 20,
        "due_in_days": 0,
    },
    {
        "title": "Rate limit 429 response missing Retry-After header for AI endpoints",
        "description": (
            "When user exceeds 20 requests per minute quota, 429 response should include seconds."
        ),
        "steps_to_reproduce": "1. Trigger throttle on /ai/triage/.",
        "expected": "Response header Retry-After: 45.",
        "actual": "Header absent.",
        "environment": "Django REST Framework Throttling",
        "status": IssueStatus.BACKLOG,
        "priority": IssuePriority.LOW,
        "severity": IssueSeverity.TRIVIAL,
        "type": IssueType.IMPROVEMENT,
        "labels": ["backend", "ai-engine"],
        "days_ago": 4,
        "due_in_days": 14,
    },
    {
        "title": "Add dark mode token contrast check for muted badge text in high-ambient lighting",
        "description": (
            "Muted text tokens on dark background fail WCAG AA contrast ratio of 4.5:1."
        ),
        "steps_to_reproduce": "1. Inspect badge element in dark theme using Lighthouse.",
        "expected": "Contrast ratio >= 4.5:1.",
        "actual": "3.8:1 contrast warning.",
        "environment": "Tailwind CSS Dark Mode",
        "status": IssueStatus.IN_PROGRESS,
        "priority": IssuePriority.MEDIUM,
        "severity": IssueSeverity.MINOR,
        "type": IssueType.IMPROVEMENT,
        "labels": ["ux", "frontend"],
        "days_ago": 2,
        "due_in_days": 5,
    },
    {
        "title": "Mobile viewport horizontal overflow on issue detail panel drawer",
        "description": (
            "Wide code blocks inside descriptions cause viewport horizontal scrolling on mobile."
        ),
        "steps_to_reproduce": "1. Open issue with 120-col code snippet on iPhone SE.",
        "expected": "Code block has independent overflow-x scroll without shifting viewport.",
        "actual": "Whole screen shifts left/right.",
        "environment": "iOS Safari 17",
        "status": IssueStatus.TODO,
        "priority": IssuePriority.MEDIUM,
        "severity": IssueSeverity.MINOR,
        "type": IssueType.BUG,
        "labels": ["ux", "frontend"],
        "days_ago": 6,
        "due_in_days": 4,
    },
    {
        "title": "Implement optimistic UI update with rollback for Kanban issue card moves",
        "description": (
            "Kanban card moves feel sluggish on high latency without instant local update."
        ),
        "steps_to_reproduce": "1. Throttle network to 3G in devtools and drag card.",
        "expected": "Card snaps to target column immediately; rolls back only if API rejects.",
        "actual": "Card waits for server roundtrip before moving.",
        "environment": "React 18 / TanStack Query",
        "status": IssueStatus.DONE,
        "priority": IssuePriority.HIGH,
        "severity": IssueSeverity.MAJOR,
        "type": IssueType.FEATURE,
        "labels": ["frontend", "performance"],
        "days_ago": 12,
        "due_in_days": 0,
    },
    {
        "title": "Overdue issues date calculation boundary in UTC vs local browser timezone",
        "description": (
            "Issues due today are marked overdue before midnight in local timezone due to UTC."
        ),
        "steps_to_reproduce": (
            "1. Set issue due date to current day.\n2. Observe overdue status in GMT+9 timezone."
        ),
        "expected": "Date comparison evaluates against user's local date.",
        "actual": "Issue marked overdue 9 hours early.",
        "environment": "Django timezone.now().date()",
        "status": IssueStatus.IN_PROGRESS,
        "priority": IssuePriority.HIGH,
        "severity": IssueSeverity.MAJOR,
        "type": IssueType.BUG,
        "labels": ["backend"],
        "days_ago": 1,
        "due_in_days": -2,  # Overdue
    },
    {
        "title": "CORS preflight caching header Max-Age missing on production API responses",
        "description": (
            "Every cross-origin API call sends an OPTIONS preflight request because "
            "Access-Control-Max-Age is not configured."
        ),
        "steps_to_reproduce": "1. Inspect network tab on any SPA navigation.",
        "expected": "OPTIONS request cached for 86400 seconds.",
        "actual": "Redundant OPTIONS request before every POST/PATCH.",
        "environment": "django-cors-headers",
        "status": IssueStatus.DONE,
        "priority": IssuePriority.MEDIUM,
        "severity": IssueSeverity.MINOR,
        "type": IssueType.IMPROVEMENT,
        "labels": ["backend", "performance", "security"],
        "days_ago": 15,
        "due_in_days": 0,
    },
    {
        "title": "Add shortcut Cmd+J to invoke AI triage directly from issue creation form",
        "description": (
            "Power users need a lightning fast way to auto-fill title, severity, priority and tags."
        ),
        "steps_to_reproduce": (
            "1. Press 'C' to open modal.\n2. Type bug details.\n3. Press Cmd+J."
        ),
        "expected": "AI triage assistant runs immediately with progress pulse.",
        "actual": "Nothing happens.",
        "environment": "Mac & Windows Chrome / Edge",
        "status": IssueStatus.DONE,
        "priority": IssuePriority.MEDIUM,
        "severity": IssueSeverity.MINOR,
        "type": IssueType.FEATURE,
        "labels": ["frontend", "ai-engine", "ux"],
        "days_ago": 18,
        "due_in_days": 0,
    },
    {
        "title": "Issue title length limit validation error message unclear on 255 char boundary",
        "description": ("Entering 256 chars displays raw DRF 'Ensure field has <= 255 chars'."),
        "steps_to_reproduce": "1. Paste a 260 char string into Title input.",
        "expected": "Inline red error below title input with remaining characters counter.",
        "actual": "Generic top alert toast.",
        "environment": "Frontend form validation",
        "status": IssueStatus.BACKLOG,
        "priority": IssuePriority.LOW,
        "severity": IssueSeverity.TRIVIAL,
        "type": IssueType.IMPROVEMENT,
        "labels": ["frontend", "ux"],
        "days_ago": 8,
        "due_in_days": 20,
    },
    {
        "title": "Add full-text search index for issue comments to enable instant mentions lookup",
        "description": (
            "Searching for discussions across past sprint comments takes > 500ms when table grows."
        ),
        "steps_to_reproduce": "1. Run query for keyword in comment bodies.",
        "expected": "Postgres GIN index on to_tsvector.",
        "actual": "Sequential table scan.",
        "environment": "Neon PostgreSQL",
        "status": IssueStatus.BACKLOG,
        "priority": IssuePriority.LOW,
        "severity": IssueSeverity.TRIVIAL,
        "type": IssueType.IMPROVEMENT,
        "labels": ["backend", "performance"],
        "days_ago": 9,
        "due_in_days": 30,
    },
    {
        "title": "Sanitize SVG file upload preview to prevent embedded script execution",
        "description": "User avatars uploaded as SVGs with embedded scripts could execute.",
        "steps_to_reproduce": "1. Upload avatar containing inline SVG script.",
        "expected": "Avatar converted to PNG or sanitized with defusedxml.",
        "actual": "Raw SVG served with image/svg+xml header.",
        "environment": "Avatar upload endpoint",
        "status": IssueStatus.CLOSED,
        "priority": IssuePriority.URGENT,
        "severity": IssueSeverity.CRITICAL,
        "type": IssueType.BUG,
        "labels": ["security", "backend"],
        "days_ago": 25,
        "due_in_days": 0,
    },
    {
        "title": "Optimize bundle size by code-splitting heavy charting and editor packages",
        "description": (
            "Initial bundle JS exceeds 1MB due to monolithic imports of Recharts and Markdown."
        ),
        "steps_to_reproduce": "1. Run npm run build and check dist assets.",
        "expected": "Dashboard and Editor dynamically imported with React.lazy().",
        "actual": "Single vendor chunk over 1,000 kB.",
        "environment": "Vite 6 / Rollup",
        "status": IssueStatus.IN_PROGRESS,
        "priority": IssuePriority.MEDIUM,
        "severity": IssueSeverity.MINOR,
        "type": IssueType.IMPROVEMENT,
        "labels": ["frontend", "performance"],
        "days_ago": 3,
        "due_in_days": 7,
    },
    {
        "title": "Implement notification bell unread count badge with 30s background polling",
        "description": (
            "Engineers need real-time awareness when issues are assigned to them or mentioned."
        ),
        "steps_to_reproduce": ("1. Open app in two windows.\n2. Assign issue to user in window 2."),
        "expected": "Red badge appears on bell icon within 30s in window 1.",
        "actual": "Requires full page refresh.",
        "environment": "TanStack Query refetchInterval",
        "status": IssueStatus.DONE,
        "priority": IssuePriority.HIGH,
        "severity": IssueSeverity.MAJOR,
        "type": IssueType.FEATURE,
        "labels": ["frontend", "backend"],
        "days_ago": 16,
        "due_in_days": 0,
    },
    {
        "title": "Add Cmd+K Command Palette with live debounced search across issues and members",
        "description": (
            "Unified global search allows engineers to jump to any issue key or project in < 50ms."
        ),
        "steps_to_reproduce": (
            "1. Press Cmd+K from any screen.\n2. Type issue number or project key."
        ),
        "expected": "Instant highlighted results with keyboard arrow navigation.",
        "actual": "Feature missing.",
        "environment": "cmdk primitive",
        "status": IssueStatus.DONE,
        "priority": IssuePriority.HIGH,
        "severity": IssueSeverity.MAJOR,
        "type": IssueType.FEATURE,
        "labels": ["frontend", "ux"],
        "days_ago": 17,
        "due_in_days": 0,
    },
    {
        "title": "Display AI duplicate warning banner when similar bug is detected during creation",
        "description": (
            "Prevents redundant bug reports by comparing vector cosine distance against "
            "existing issues in real time."
        ),
        "steps_to_reproduce": (
            "1. Type existing bug description into title.\n2. Observe duplicate detection warning."
        ),
        "expected": "Banner shows 85%+ similarity match with link to inspect existing issue.",
        "actual": "No similarity feedback given.",
        "environment": "pgvector + Gemini embeddings",
        "status": IssueStatus.DONE,
        "priority": IssuePriority.HIGH,
        "severity": IssueSeverity.MAJOR,
        "type": IssueType.FEATURE,
        "labels": ["ai-engine", "frontend"],
        "days_ago": 19,
        "due_in_days": 0,
    },
]

# Generate remaining 20 issues to reach 40+ total realistic issues
for idx in range(21, 41):
    status_cycle = [
        IssueStatus.BACKLOG,
        IssueStatus.TODO,
        IssueStatus.IN_PROGRESS,
        IssueStatus.IN_REVIEW,
        IssueStatus.DONE,
    ]
    prio_cycle = [
        IssuePriority.LOW,
        IssuePriority.MEDIUM,
        IssuePriority.HIGH,
        IssuePriority.URGENT,
    ]
    sev_cycle = [
        IssueSeverity.TRIVIAL,
        IssueSeverity.MINOR,
        IssueSeverity.MAJOR,
        IssueSeverity.CRITICAL,
    ]

    selected_status = status_cycle[idx % len(status_cycle)]
    selected_prio = prio_cycle[idx % len(prio_cycle)]
    selected_sev = sev_cycle[idx % len(sev_cycle)]

    ISSUES_DATA.append(
        {
            "title": f"Service reliability and metric check #{idx}: automated sprint health audit",
            "description": (
                f"Automated monitoring check for system component #{idx}. "
                "Tracks memory limits, response latency, and database query budgets under load."
            ),
            "steps_to_reproduce": (
                f"1. Trigger load generator against endpoint group #{idx}.\n"
                "2. Inspect latency metrics."
            ),
            "expected": "P99 latency remains under 200ms.",
            "actual": "Spikes to 450ms under sustained concurrency.",
            "environment": "Staging cluster / Kubernetes",
            "status": selected_status,
            "priority": selected_prio,
            "severity": selected_sev,
            "type": IssueType.TASK if idx % 2 == 0 else IssueType.IMPROVEMENT,
            "labels": ["backend", "performance"] if idx % 2 == 0 else ["frontend", "ux"],
            "days_ago": idx % 28,
            "due_in_days": (idx % 14) - 2 if idx % 5 == 0 else (idx % 10) + 3,
        }
    )


class Command(BaseCommand):
    help = "Seeds database with 4 realistic users, 2 projects, labels, 40+ issues and comments."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding BugSense demo workspace..."))

        # 1. Users
        users_by_email: dict[str, User] = {}
        for u_data in DEMO_USERS_DATA:
            user, created = User.objects.get_or_create(
                email=u_data["email"],
                defaults={
                    "full_name": u_data["full_name"],
                    "avatar_url": u_data["avatar_url"],
                    "is_active": True,
                },
            )
            if created or not user.has_usable_password():
                user.set_password(u_data["password"])
                user.save()
            users_by_email[user.email] = user
            state = "Created" if created else "Found"
            self.stdout.write(f"  [{state} User] {user.email} ({user.full_name})")

        recruiter = users_by_email["demo@bugsense.dev"]
        sarah = users_by_email["sarah.chen@bugsense.dev"]
        marcus = users_by_email["marcus.vance@bugsense.dev"]
        elena = users_by_email["elena.rostova@bugsense.dev"]
        all_members = [recruiter, sarah, marcus, elena]

        # 2. Projects
        projects_by_key: dict[str, Project] = {}
        for p_data in DEMO_PROJECTS_DATA:
            owner = recruiter if p_data["key"] == "BUG" else sarah
            proj, created = Project.objects.get_or_create(
                key=p_data["key"],
                defaults={
                    "name": p_data["name"],
                    "description": p_data["description"],
                    "owner": owner,
                },
            )
            projects_by_key[proj.key] = proj
            state = "Created" if created else "Found"
            self.stdout.write(f"  [{state} Project] {proj.name} [{proj.key}]")

        bug_proj = projects_by_key["BUG"]
        mob_proj = projects_by_key["MOB"]

        # 3. Memberships
        role_map = [
            (bug_proj, recruiter, RoleChoices.OWNER),
            (bug_proj, sarah, RoleChoices.ADMIN),
            (bug_proj, marcus, RoleChoices.MEMBER),
            (bug_proj, elena, RoleChoices.MEMBER),
            (mob_proj, sarah, RoleChoices.OWNER),
            (mob_proj, recruiter, RoleChoices.ADMIN),
        ]
        for p, u, r in role_map:
            m, m_created = Membership.objects.get_or_create(
                project=p,
                user=u,
                defaults={"role": r},
            )
            if not m_created and m.role != r:
                m.role = r
                m.save()

        # 4. Labels for BUG project
        labels_by_name: dict[str, Label] = {}
        for l_data in DEMO_LABELS_DATA:
            lbl, _ = Label.objects.get_or_create(
                project=bug_proj,
                name=l_data["name"],
                defaults={
                    "color": l_data["color"],
                    "description": l_data["description"],
                },
            )
            labels_by_name[lbl.name] = lbl

        # 5. Populate 40+ Issues
        self.stdout.write(self.style.NOTICE(f"Populating {len(ISSUES_DATA)} realistic issues..."))
        created_issues = []
        now = timezone.now()

        for idx, item in enumerate(ISSUES_DATA):
            # Check if an issue with this title already exists in BUG project
            existing = bug_proj.issues.filter(title=item["title"]).first()
            if existing:
                created_issues.append(existing)
                continue

            reporter = all_members[idx % len(all_members)]
            assignee = all_members[(idx + 1) % len(all_members)] if (idx % 6 != 0) else None

            created_date = now - timedelta(days=item.get("days_ago", 1))
            due_in = item.get("due_in_days")
            due_date = (now.date() + timedelta(days=due_in)) if due_in is not None else None

            issue_labels = [
                labels_by_name[n] for n in item.get("labels", []) if n in labels_by_name
            ]

            # Create issue
            issue = create_issue(
                project=bug_proj,
                reporter=reporter,
                title=item["title"],
                description=item["description"],
                steps_to_reproduce=item.get("steps_to_reproduce", ""),
                expected=item.get("expected", ""),
                actual=item.get("actual", ""),
                environment=item.get("environment", ""),
                status=item.get("status", IssueStatus.TODO),
                priority=item.get("priority", IssuePriority.MEDIUM),
                severity=item.get("severity", IssueSeverity.MINOR),
                type=item.get("type", IssueType.BUG),
                assignee=assignee,
                due_date=due_date,
                labels=issue_labels,
            )

            # Backdate created_at for realistic trend line
            issue.created_at = created_date
            if issue.status in [IssueStatus.DONE, IssueStatus.CLOSED]:
                issue.updated_at = created_date + timedelta(hours=48)
            else:
                issue.updated_at = created_date + timedelta(hours=6)
            issue.save(update_fields=["created_at", "updated_at"])

            created_issues.append(issue)

        self.stdout.write(
            f"  Successfully verified {len(created_issues)} issues in {bug_proj.name}."
        )

        # 6. Add Comments with Mentions on First 4 Issues
        sample_comments = [
            (
                "Investigated trace logs. Token refresh lock needs to be scoped per session.",
                sarah,
            ),
            (
                "Agreed with @Sarah Chen. Pairing with @Demo Recruiter this afternoon on staging.",
                marcus,
            ),
            ("PR submitted and passed all pre-commit Ruff and Vitest checks.", elena),
            ("Verified on production. Response latency is down from 450ms to 65ms.", recruiter),
        ]

        if created_issues:
            for i, issue in enumerate(created_issues[:4]):
                if issue.comments.count() == 0:
                    body, author = sample_comments[i % len(sample_comments)]
                    create_comment(issue=issue, author=author, body=body)

        self.stdout.write(self.style.SUCCESS("✓ BugSense demo workspace seeded successfully!"))
        self.stdout.write(self.style.SUCCESS("  Demo Login: demo@bugsense.dev / DemoPassword123!"))
