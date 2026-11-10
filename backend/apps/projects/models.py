import re
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class RoleChoices(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    MEMBER = "member", "Member"
    VIEWER = "viewer", "Viewer"


def validate_project_key(value: str) -> None:
    if not value:
        raise ValidationError("Project key cannot be empty.")
    if not re.match(r"^[A-Z0-9]{2,10}$", value):
        raise ValidationError(
            "Project key must be between 2 and 10 uppercase alphanumeric characters."
        )


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    key = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        validators=[validate_project_key],
        help_text="Unique short identifier for issues (e.g. 'BUG', 'WEB').",
    )
    description = models.TextField(blank=True, default="")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_projects",
    )
    archived = models.BooleanField(default=False, db_index=True)
    default_assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_assigned_projects",
    )
    triage_rotation_enabled = models.BooleanField(default=False)
    triage_rotation_cadence = models.CharField(
        max_length=16,
        choices=[("daily", "Daily"), ("weekly", "Weekly")],
        default="weekly",
    )
    current_triager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="triaging_projects",
    )
    triage_rotation_updated_at = models.DateTimeField(null=True, blank=True)
    ai_auto_triage = models.BooleanField(default=True)
    ai_confidence_threshold = models.FloatField(default=0.6)
    ai_priority_rules = models.JSONField(default=dict, blank=True)
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "projects"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["archived", "-created_at"], name="proj_archived_created_idx"),
        ]

    def __str__(self) -> str:
        return f"[{self.key}] {self.name}"

    def clean(self) -> None:
        super().clean()
        if self.key:
            self.key = self.key.strip().upper()
            validate_project_key(self.key)

    def save(self, *args, **kwargs) -> None:
        if self.key:
            self.key = self.key.strip().upper()
        if self.pk:
            existing = Project.objects.filter(pk=self.pk).values("key").first()
            if existing and existing["key"] != self.key:
                raise ValidationError({"key": "Project key cannot be modified after creation."})
        self.full_clean()
        super().save(*args, **kwargs)


class Membership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.MEMBER,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "memberships"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "user"],
                name="unique_project_user_membership",
            )
        ]
        indexes = [
            models.Index(fields=["project", "role"], name="member_proj_role_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.project.key} ({self.role})"


class InviteStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REVOKED = "revoked", "Revoked"


class ProjectInvite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="invites",
    )
    email = models.EmailField(blank=True, default="")
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.MEMBER,
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_project_invites",
    )
    status = models.CharField(
        max_length=20,
        choices=InviteStatus.choices,
        default=InviteStatus.PENDING,
        db_index=True,
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_project_invites",
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_invites"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        target = self.email or "share-link"
        return f"Invite ({target}) -> {self.project.key} [{self.status}]"


class IntegrationProvider(models.TextChoices):
    GITHUB = "github", "GitHub"
    SLACK = "slack", "Slack"
    EMAIL_IN = "email_in", "Email-in"
    SENTRY = "sentry", "Sentry"
    PUBLIC_FORM = "public_form", "Public Report Form"


class ProjectIntegration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="integrations",
    )
    provider = models.CharField(
        max_length=32,
        choices=IntegrationProvider.choices,
    )
    enabled = models.BooleanField(default=False)
    config = models.JSONField(default=dict, blank=True)
    webhook_secret = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "project_integrations"
        ordering = ["provider"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "provider"],
                name="unique_project_integration_provider",
            )
        ]

    def __str__(self) -> str:
        return f"{self.project.key} · {self.provider} ({'on' if self.enabled else 'off'})"
