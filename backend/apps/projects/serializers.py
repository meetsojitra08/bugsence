import re

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.issues.models import Issue, IssueStatus
from apps.projects.models import (
    Membership,
    Project,
    ProjectIntegration,
    ProjectInvite,
    RoleChoices,
)

User = get_user_model()


class MembershipUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "avatar_url", "last_active_at")
        read_only_fields = fields


class MembershipSerializer(serializers.ModelSerializer):
    user = MembershipUserSerializer(read_only=True)
    open_issues_count = serializers.SerializerMethodField()
    last_active = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = (
            "id",
            "user",
            "role",
            "open_issues_count",
            "last_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "open_issues_count",
            "last_active",
            "created_at",
            "updated_at",
        )

    def get_open_issues_count(self, obj: Membership) -> int:
        open_statuses = [
            IssueStatus.BACKLOG,
            IssueStatus.TODO,
            IssueStatus.IN_PROGRESS,
            IssueStatus.IN_REVIEW,
        ]
        return Issue.objects.filter(
            project_id=obj.project_id,
            assignee_id=obj.user_id,
            status__in=open_statuses,
        ).count()

    def get_last_active(self, obj: Membership):
        return obj.user.last_active_at or obj.user.last_login


class MembershipCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(
        choices=RoleChoices.choices,
        default=RoleChoices.MEMBER,
    )


class MembershipUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=RoleChoices.choices, required=True)


class ProjectInviteSerializer(serializers.ModelSerializer):
    invited_by = MembershipUserSerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = ProjectInvite
        fields = (
            "id",
            "email",
            "role",
            "token",
            "status",
            "invited_by",
            "expires_at",
            "is_expired",
            "created_at",
        )
        read_only_fields = fields

    def get_is_expired(self, obj: ProjectInvite) -> bool:
        return bool(obj.expires_at and obj.expires_at < timezone.now())


class ProjectInviteCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    role = serializers.ChoiceField(
        choices=[RoleChoices.OWNER, RoleChoices.MEMBER, RoleChoices.VIEWER, RoleChoices.ADMIN],
        default=RoleChoices.MEMBER,
    )


class ProjectIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectIntegration
        fields = (
            "id",
            "provider",
            "enabled",
            "config",
            "webhook_secret",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "provider", "created_at", "updated_at")


class ProjectIntegrationUpdateSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(required=False)
    config = serializers.JSONField(required=False)
    regenerate_secret = serializers.BooleanField(required=False, default=False)


class ProjectListSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()
    members_count = serializers.IntegerField(read_only=True, default=1)
    default_assignee = MembershipUserSerializer(read_only=True)
    current_triager = MembershipUserSerializer(read_only=True)
    inbox_count = serializers.SerializerMethodField()
    total_issues_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "key",
            "description",
            "owner_id",
            "archived",
            "my_role",
            "members_count",
            "default_assignee_id",
            "default_assignee",
            "triage_rotation_enabled",
            "triage_rotation_cadence",
            "current_triager_id",
            "current_triager",
            "ai_auto_triage",
            "ai_confidence_threshold",
            "is_demo",
            "inbox_count",
            "total_issues_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_my_role(self, obj: Project) -> str | None:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        # Check prefetched memberships if available to avoid extra DB queries
        has_cache = hasattr(obj, "_prefetched_objects_cache")
        if has_cache and "memberships" in obj._prefetched_objects_cache:
            for membership in obj.memberships.all():
                if membership.user_id == request.user.id:
                    return membership.role

        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None

    def get_inbox_count(self, obj: Project) -> int:
        now = timezone.now()
        return (
            Issue.objects.filter(project=obj, status=IssueStatus.INBOX)
            .exclude(snoozed_until__gt=now)
            .count()
        )

    def get_total_issues_count(self, obj: Project) -> int:
        return Issue.objects.filter(project=obj).count()


class ProjectDetailSerializer(ProjectListSerializer):
    pass


class ProjectCreateSerializer(serializers.ModelSerializer):
    key = serializers.CharField(max_length=10, min_length=2, required=False, allow_blank=True)

    class Meta:
        model = Project
        fields = ("name", "key", "description")

    def validate_key(self, value: str) -> str:
        cleaned = value.strip().upper()
        if not cleaned:
            return ""
        if not re.match(r"^[A-Z0-9]{2,10}$", cleaned):
            raise serializers.ValidationError(
                "Key must be between 2 and 10 uppercase alphanumeric characters."
            )
        if Project.objects.filter(key=cleaned).exists():
            raise serializers.ValidationError("A project with this key already exists.")
        return cleaned


class ProjectUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    archived = serializers.BooleanField(required=False)
    default_assignee_id = serializers.UUIDField(required=False, allow_null=True)
    triage_rotation_enabled = serializers.BooleanField(required=False)
    triage_rotation_cadence = serializers.ChoiceField(choices=["daily", "weekly"], required=False)
    current_triager_id = serializers.UUIDField(required=False, allow_null=True)
    ai_auto_triage = serializers.BooleanField(required=False)
    ai_confidence_threshold = serializers.FloatField(min_value=0.0, max_value=1.0, required=False)
