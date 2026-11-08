from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.issues.models import Issue
from apps.notifications.models import Notification

User = get_user_model()


class NotificationActorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "avatar_url")
        read_only_fields = fields


class NotificationIssueSerializer(serializers.ModelSerializer):
    project_key = serializers.CharField(source="project.key", read_only=True)

    class Meta:
        model = Issue
        fields = ("id", "number", "key", "title", "project_key", "status")
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    actor = NotificationActorSerializer(read_only=True)
    issue = NotificationIssueSerializer(read_only=True)
    is_read = serializers.BooleanField(read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id",
            "kind",
            "title",
            "message",
            "actor",
            "issue",
            "comment_id",
            "read_at",
            "is_read",
            "created_at",
        )
        read_only_fields = fields


class NotificationUnreadCountSerializer(serializers.Serializer):
    count = serializers.IntegerField()
