import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.issues.models import (
    Activity,
    Issue,
    IssuePriority,
    IssueSeverity,
    IssueStatus,
    IssueType,
    Label,
)

User = get_user_model()


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ("id", "name", "color", "description")
        read_only_fields = ("id",)


class LabelCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ("name", "color", "description")

    def validate_color(self, value: str) -> str:
        cleaned = value.strip()
        if not re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", cleaned):
            raise serializers.ValidationError("Invalid hex color format (e.g. #6366F1 or #FFF).")
        return cleaned


class IssueUserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "avatar_url")
        read_only_fields = fields


class IssueListSerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)
    reporter = IssueUserSummarySerializer(read_only=True)
    assignee = IssueUserSummarySerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    project_key = serializers.CharField(source="project.key", read_only=True)

    class Meta:
        model = Issue
        fields = (
            "id",
            "number",
            "key",
            "project_key",
            "title",
            "status",
            "priority",
            "severity",
            "type",
            "reporter",
            "assignee",
            "labels",
            "due_date",
            "position",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class IssueDetailSerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)
    reporter = IssueUserSummarySerializer(read_only=True)
    assignee = IssueUserSummarySerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    project_id = serializers.UUIDField(source="project.id", read_only=True)
    project_key = serializers.CharField(source="project.key", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Issue
        fields = (
            "id",
            "number",
            "key",
            "project_id",
            "project_key",
            "project_name",
            "title",
            "description",
            "steps_to_reproduce",
            "expected",
            "actual",
            "environment",
            "status",
            "priority",
            "severity",
            "type",
            "reporter",
            "assignee",
            "labels",
            "due_date",
            "position",
            "ai_summary",
            "ai_metadata",
            "duplicate_of_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class IssueCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    steps_to_reproduce = serializers.CharField(required=False, allow_blank=True, default="")
    expected = serializers.CharField(required=False, allow_blank=True, default="")
    actual = serializers.CharField(required=False, allow_blank=True, default="")
    environment = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default=""
    )

    status = serializers.ChoiceField(choices=IssueStatus.choices, default=IssueStatus.TODO)
    priority = serializers.ChoiceField(choices=IssuePriority.choices, default=IssuePriority.MEDIUM)
    severity = serializers.ChoiceField(choices=IssueSeverity.choices, default=IssueSeverity.MINOR)
    type = serializers.ChoiceField(choices=IssueType.choices, default=IssueType.BUG)

    assignee_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    label_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True, default=list
    )
    due_date = serializers.DateField(required=False, allow_null=True, default=None)


class IssueUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    steps_to_reproduce = serializers.CharField(required=False, allow_blank=True)
    expected = serializers.CharField(required=False, allow_blank=True)
    actual = serializers.CharField(required=False, allow_blank=True)
    environment = serializers.CharField(max_length=255, required=False, allow_blank=True)

    status = serializers.ChoiceField(choices=IssueStatus.choices, required=False)
    priority = serializers.ChoiceField(choices=IssuePriority.choices, required=False)
    severity = serializers.ChoiceField(choices=IssueSeverity.choices, required=False)
    type = serializers.ChoiceField(choices=IssueType.choices, required=False)

    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    label_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    due_date = serializers.DateField(required=False, allow_null=True)
    position = serializers.FloatField(required=False)


class ActivitySerializer(serializers.ModelSerializer):
    actor = IssueUserSummarySerializer(read_only=True)

    class Meta:
        model = Activity
        fields = (
            "id",
            "actor",
            "verb",
            "field",
            "old_value",
            "new_value",
            "created_at",
        )
        read_only_fields = fields


class IssueMoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=IssueStatus.choices, required=True)
    before_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    after_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class ProjectBoardSerializer(serializers.Serializer):
    columns = serializers.DictField(
        child=IssueListSerializer(many=True),
        help_text="Issues grouped by status column in ascending board position order",
    )
    counts = serializers.DictField(
        child=serializers.IntegerField(),
        help_text="Total active issue count per column",
    )
