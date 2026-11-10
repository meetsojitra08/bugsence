import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.issues.models import (
    Activity,
    Comment,
    Issue,
    IssueAttachment,
    IssuePriority,
    IssueSeverity,
    IssueSource,
    IssueStatus,
    IssueType,
    Label,
    PullRequestLink,
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


class IssueSummaryRefSerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)

    class Meta:
        model = Issue
        fields = ("id", "number", "key", "title", "status", "priority")
        read_only_fields = fields


class PullRequestLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = PullRequestLink
        fields = (
            "id",
            "pr_number",
            "title",
            "url",
            "branch",
            "repo_full_name",
            "state",
            "ci_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class IssueAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = IssueAttachment
        fields = ("id", "filename", "content_type", "url", "created_at")
        read_only_fields = fields

    def get_url(self, obj: IssueAttachment) -> str:
        request = self.context.get("request")
        if obj.file:
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return ""


class IssueListSerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)
    reporter = IssueUserSummarySerializer(read_only=True)
    assignee = IssueUserSummarySerializer(read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    project_key = serializers.CharField(source="project.key", read_only=True)
    pull_requests = PullRequestLinkSerializer(many=True, read_only=True)

    class Meta:
        model = Issue
        fields = (
            "id",
            "number",
            "key",
            "project_key",
            "title",
            "description",
            "status",
            "priority",
            "severity",
            "type",
            "source",
            "reporter",
            "assignee",
            "external_reporter_name",
            "external_reporter_email",
            "labels",
            "due_date",
            "position",
            "is_blocking_release",
            "snoozed_until",
            "resolved_at",
            "ai_metadata",
            "duplicate_of_id",
            "pull_requests",
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
    duplicate_of = IssueSummaryRefSerializer(read_only=True)
    parent = IssueSummaryRefSerializer(read_only=True)
    sub_issues = IssueSummaryRefSerializer(many=True, read_only=True)
    pull_requests = PullRequestLinkSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()

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
            "source",
            "reporter",
            "assignee",
            "external_reporter_name",
            "external_reporter_email",
            "external_ref",
            "labels",
            "due_date",
            "position",
            "is_blocking_release",
            "snoozed_until",
            "resolution_note",
            "resolved_at",
            "checklist",
            "ai_summary",
            "ai_metadata",
            "duplicate_of_id",
            "duplicate_of",
            "parent_id",
            "parent",
            "sub_issues",
            "pull_requests",
            "comments_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_comments_count(self, obj: Issue) -> int:
        if hasattr(obj, "comments_count"):
            return obj.comments_count
        return obj.comments.count()


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
    source = serializers.ChoiceField(choices=IssueSource.choices, default=IssueSource.MANUAL)

    assignee_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    label_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True, default=list
    )
    due_date = serializers.DateField(required=False, allow_null=True, default=None)
    external_reporter_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    external_reporter_email = serializers.EmailField(required=False, allow_blank=True, default="")
    is_blocking_release = serializers.BooleanField(required=False, default=False)
    duplicate_of_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    parent_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    checklist = serializers.ListField(
        child=serializers.DictField(), required=False, allow_empty=True, default=list
    )


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
    external_reporter_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    external_reporter_email = serializers.EmailField(required=False, allow_blank=True)
    is_blocking_release = serializers.BooleanField(required=False)
    duplicate_of_id = serializers.UUIDField(required=False, allow_null=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    checklist = serializers.ListField(child=serializers.DictField(), required=False)
    resolution_note = serializers.CharField(required=False, allow_blank=True)
    snoozed_until = serializers.DateTimeField(required=False, allow_null=True)


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


class CommentSerializer(serializers.ModelSerializer):
    author = IssueUserSummarySerializer(read_only=True)
    is_edited = serializers.BooleanField(read_only=True)

    class Meta:
        model = Comment
        fields = (
            "id",
            "author",
            "body",
            "created_at",
            "edited_at",
            "is_edited",
        )
        read_only_fields = ("id", "author", "created_at", "edited_at", "is_edited")


class CommentCreateSerializer(serializers.Serializer):
    body = serializers.CharField(required=True, allow_blank=False, min_length=1)

    def validate_body(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Comment body cannot be blank.")
        return cleaned


class CommentUpdateSerializer(serializers.Serializer):
    body = serializers.CharField(required=True, allow_blank=False, min_length=1)

    def validate_body(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Comment body cannot be blank.")
        return cleaned


class TimelineItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=["activity", "comment"])
    actor = IssueUserSummarySerializer()
    verb = serializers.CharField()
    field = serializers.CharField(allow_blank=True, default="")
    old_value = serializers.CharField(allow_blank=True, default="")
    new_value = serializers.CharField(allow_blank=True, default="")
    body = serializers.CharField(allow_blank=True, default="")
    is_edited = serializers.BooleanField(default=False)
    edited_at = serializers.DateTimeField(allow_null=True, default=None)
    created_at = serializers.DateTimeField()


class IssueInboxTriageSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["accept", "assign", "merge", "snooze", "reject"],
        required=True,
    )
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    priority = serializers.ChoiceField(choices=IssuePriority.choices, required=False)
    target_issue_id = serializers.UUIDField(required=False, allow_null=True)
    snooze_hours = serializers.IntegerField(required=False, min_value=1, max_value=720, default=24)
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class IssueResolveSerializer(serializers.Serializer):
    resolution_note = serializers.CharField(required=False, allow_blank=True, default="")
    notify_reporter = serializers.BooleanField(required=False, default=True)


class ChecklistConvertSerializer(serializers.Serializer):
    item_id = serializers.CharField(required=True, max_length=64)


class IssueBulkActionSerializer(serializers.Serializer):
    issue_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100,
    )
    action = serializers.ChoiceField(
        choices=["assign", "status", "add_label", "archive"],
        required=True,
    )
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=IssueStatus.choices, required=False)
    label_id = serializers.UUIDField(required=False, allow_null=True)


class PullRequestCreateSerializer(serializers.Serializer):
    pr_number = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    url = serializers.URLField(max_length=500)
    branch = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    repo_full_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default=""
    )
    state = serializers.ChoiceField(choices=["open", "merged", "closed"], default="open")
    ci_status = serializers.ChoiceField(
        choices=["pending", "success", "failure", "unknown"], default="unknown"
    )
