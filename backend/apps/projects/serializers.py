import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.projects.models import Membership, Project, RoleChoices

User = get_user_model()


class MembershipUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "avatar_url")
        read_only_fields = fields


class MembershipSerializer(serializers.ModelSerializer):
    user = MembershipUserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ("id", "user", "role", "created_at", "updated_at")
        read_only_fields = ("id", "user", "created_at", "updated_at")


class MembershipCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(
        choices=RoleChoices.choices,
        default=RoleChoices.MEMBER,
    )


class MembershipUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=RoleChoices.choices, required=True)


class ProjectListSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()
    members_count = serializers.IntegerField(read_only=True, default=1)

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


class ProjectDetailSerializer(ProjectListSerializer):
    pass


class ProjectCreateSerializer(serializers.ModelSerializer):
    key = serializers.CharField(max_length=10, min_length=2)

    class Meta:
        model = Project
        fields = ("name", "key", "description")

    def validate_key(self, value: str) -> str:
        cleaned = value.strip().upper()
        if not re.match(r"^[A-Z0-9]{2,10}$", cleaned):
            raise serializers.ValidationError(
                "Key must be between 2 and 10 uppercase alphanumeric characters."
            )
        if Project.objects.filter(key=cleaned).exists():
            raise serializers.ValidationError("A project with this key already exists.")
        return cleaned


class ProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("name", "description", "archived")
