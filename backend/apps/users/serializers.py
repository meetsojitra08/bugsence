"""Serializers for User authentication and profile endpoints."""

from rest_framework import serializers

from apps.users.models import User


class UserSummarySerializer(serializers.ModelSerializer):
    """Compact user representation for lists and relationships."""

    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "avatar_url", "display_name"]
        read_only_fields = ["id", "display_name"]


DEFAULT_NOTIFICATION_PREFERENCES = {
    "assigned": {"in_app": True, "email": True, "slack": True},
    "mention": {"in_app": True, "email": True, "slack": False},
    "pr_status": {"in_app": True, "email": False, "slack": False},
    "inbox_arrival": {"in_app": True, "email": False, "slack": True},
    "resolved": {"in_app": True, "email": True, "slack": True},
}


def merge_notification_preferences(raw: dict | None) -> dict:
    merged = {k: dict(v) for k, v in DEFAULT_NOTIFICATION_PREFERENCES.items()}
    if isinstance(raw, dict):
        for event_key, channels in raw.items():
            if event_key in merged and isinstance(channels, dict):
                for ch in ("in_app", "email", "slack"):
                    if ch in channels:
                        merged[event_key][ch] = bool(channels[ch])
    return merged


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user profile serializer with update support."""

    display_name = serializers.CharField(read_only=True)
    notification_preferences = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "avatar_url",
            "timezone",
            "notification_preferences",
            "last_active_at",
            "display_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "last_active_at",
            "display_name",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["notification_preferences"] = merge_notification_preferences(
            getattr(instance, "notification_preferences", None)
        )
        return data

    def validate_notification_preferences(self, value):
        return merge_notification_preferences(value)


class RegisterRequestSerializer(serializers.Serializer):
    """Input serializer for registration."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class LoginRequestSerializer(serializers.Serializer):
    """Input serializer for user login."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class TokenResponseSerializer(serializers.Serializer):
    """Response serializer containing JWT tokens and authenticated user."""

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSummarySerializer()


class ChangePasswordRequestSerializer(serializers.Serializer):
    """Input serializer for password update."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class LogoutRequestSerializer(serializers.Serializer):
    """Input serializer for logging out and blacklisting refresh token."""

    refresh = serializers.CharField()
