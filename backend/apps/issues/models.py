import uuid

from django.conf import settings
from django.db import models
from pgvector.django import VectorField

from apps.projects.models import Project


class Label(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="labels",
    )
    name = models.CharField(max_length=50)
    color = models.CharField(
        max_length=20,
        default="#6366F1",
        help_text="Hex color code (e.g. '#6366F1')",
    )
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "labels"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "name"],
                name="unique_project_label_name",
            )
        ]

    def __str__(self) -> str:
        return f"{self.project.key}: {self.name}"


class IssueStatus(models.TextChoices):
    INBOX = "inbox", "Inbox"
    BACKLOG = "backlog", "Backlog"
    TODO = "todo", "To Do"
    IN_PROGRESS = "in_progress", "In Progress"
    IN_REVIEW = "in_review", "In Review"
    DONE = "done", "Done"
    CLOSED = "closed", "Closed"


class IssueSource(models.TextChoices):
    MANUAL = "manual", "Manual"
    SLACK = "slack", "Slack"
    EMAIL = "email", "Email"
    SENTRY = "sentry", "Sentry"
    PUBLIC_FORM = "public_form", "Public Form"


class IssuePriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class IssueSeverity(models.TextChoices):
    TRIVIAL = "trivial", "Trivial"
    MINOR = "minor", "Minor"
    MAJOR = "major", "Major"
    CRITICAL = "critical", "Critical"


class IssueType(models.TextChoices):
    BUG = "bug", "Bug"
    FEATURE = "feature", "Feature"
    TASK = "task", "Task"
    IMPROVEMENT = "improvement", "Improvement"


class ActiveIssueManager(models.Manager):
    """Excludes soft-deleted issues from the standard queryset."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class Issue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="issues",
    )
    number = models.PositiveIntegerField(help_text="Per-project sequence number (1, 2, 3...)")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    steps_to_reproduce = models.TextField(blank=True, default="")
    expected = models.TextField(blank=True, default="")
    actual = models.TextField(blank=True, default="")
    environment = models.CharField(max_length=255, blank=True, default="")

    status = models.CharField(
        max_length=20,
        choices=IssueStatus.choices,
        default=IssueStatus.TODO,
        db_index=True,
    )
    priority = models.CharField(
        max_length=20,
        choices=IssuePriority.choices,
        default=IssuePriority.MEDIUM,
        db_index=True,
    )
    severity = models.CharField(
        max_length=20,
        choices=IssueSeverity.choices,
        default=IssueSeverity.MINOR,
        db_index=True,
    )
    type = models.CharField(
        max_length=20,
        choices=IssueType.choices,
        default=IssueType.BUG,
        db_index=True,
    )

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reported_issues",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_issues",
    )
    labels = models.ManyToManyField(Label, blank=True, related_name="issues")
    due_date = models.DateField(null=True, blank=True)
    position = models.FloatField(default=65536.0, db_index=True)

    embedding = VectorField(dimensions=768, null=True, blank=True)
    ai_summary = models.TextField(blank=True, default="")
    ai_metadata = models.JSONField(default=dict, blank=True)

    duplicate_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duplicates",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sub_issues",
    )
    source = models.CharField(
        max_length=20,
        choices=IssueSource.choices,
        default=IssueSource.MANUAL,
        db_index=True,
    )
    external_reporter_name = models.CharField(max_length=150, blank=True, default="")
    external_reporter_email = models.EmailField(blank=True, default="")
    external_ref = models.CharField(max_length=255, blank=True, default="")
    snoozed_until = models.DateTimeField(null=True, blank=True, db_index=True)
    resolution_note = models.TextField(blank=True, default="")
    resolved_at = models.DateTimeField(null=True, blank=True)
    is_blocking_release = models.BooleanField(default=False, db_index=True)
    checklist = models.JSONField(default=list, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Managers
    objects = ActiveIssueManager()
    all_objects = models.Manager()

    class Meta:
        db_table = "issues"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "number"],
                name="unique_project_issue_number",
            )
        ]
        indexes = [
            models.Index(fields=["project", "status"], name="issue_proj_status_idx"),
            models.Index(fields=["project", "assignee"], name="issue_proj_assignee_idx"),
            models.Index(fields=["project", "priority"], name="issue_proj_priority_idx"),
            models.Index(fields=["project", "position"], name="issue_proj_pos_idx"),
            models.Index(fields=["project", "-created_at"], name="issue_proj_created_idx"),
        ]

    @property
    def key(self) -> str:
        return f"{self.project.key}-{self.number}"

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def __str__(self) -> str:
        return f"[{self.key}] {self.title}"


class Activity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activities",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="activities",
    )
    verb = models.CharField(max_length=50)
    field = models.CharField(max_length=50, blank=True, default="")
    old_value = models.TextField(blank=True, default="")
    new_value = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "activities"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["issue", "-created_at"], name="act_issue_created_idx"),
            models.Index(fields=["project", "-created_at"], name="act_proj_created_idx"),
        ]

    def __str__(self) -> str:
        actor_name = self.actor.email if self.actor else "System"
        return f"{actor_name} {self.verb} on {self.issue or self.project}"


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "comments"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["issue", "created_at"], name="comment_issue_created_idx"),
        ]

    @property
    def is_edited(self) -> bool:
        return self.edited_at is not None

    def __str__(self) -> str:
        return f"Comment by {self.author.email} on {self.issue.key}"


class PRState(models.TextChoices):
    OPEN = "open", "Open"
    MERGED = "merged", "Merged"
    CLOSED = "closed", "Closed"


class CIStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCESS = "success", "Success"
    FAILURE = "failure", "Failure"
    UNKNOWN = "unknown", "Unknown"


class PullRequestLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name="pull_requests",
    )
    pr_number = models.PositiveIntegerField()
    title = models.CharField(max_length=255, blank=True, default="")
    url = models.URLField(max_length=500)
    branch = models.CharField(max_length=255, blank=True, default="")
    repo_full_name = models.CharField(max_length=255, blank=True, default="")
    state = models.CharField(
        max_length=20,
        choices=PRState.choices,
        default=PRState.OPEN,
    )
    ci_status = models.CharField(
        max_length=20,
        choices=CIStatus.choices,
        default=CIStatus.UNKNOWN,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pull_request_links"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["issue", "url"],
                name="unique_issue_pr_url",
            )
        ]

    def __str__(self) -> str:
        return f"PR #{self.pr_number} ({self.state}) -> {self.issue.key}"


class IssueAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_attachments",
    )
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, default="image/png")
    file = models.FileField(upload_to="issue_attachments/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "issue_attachments"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.filename} ({self.project.key})"
