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


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user profile serializer with update support."""

    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "avatar_url",
            "display_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "email", "display_name", "created_at", "updated_at"]


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
