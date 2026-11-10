"""API views for user authentication and user profile management."""

import os
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.storage import default_storage
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.issues.notifications_dispatch import send_email_safely
from apps.users.serializers import (
    ChangePasswordRequestSerializer,
    ForgotPasswordRequestSerializer,
    LoginRequestSerializer,
    LogoutRequestSerializer,
    RegisterRequestSerializer,
    ResetPasswordConfirmSerializer,
    TokenResponseSerializer,
    UserDetailSerializer,
)
from apps.users.services import (
    authenticate_user,
    blacklist_refresh_token,
    change_user_password,
    register_user,
)


class RegisterView(APIView):
    """Register a new user account and obtain initial JWT tokens."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(
        request=RegisterRequestSerializer,
        responses={201: TokenResponseSerializer},
        description="Register a new user and receive JWT access & refresh tokens.",
    )
    def post(self, request: Request) -> Response:
        serializer = RegisterRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, tokens = register_user(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            full_name=serializer.validated_data.get("full_name", ""),
        )

        response_data = {
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": user,
        }
        output = TokenResponseSerializer(response_data)
        return Response(output.data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Authenticate with email and password to receive JWT tokens."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(
        request=LoginRequestSerializer,
        responses={200: TokenResponseSerializer},
        description="Authenticate user and obtain JWT tokens.",
    )
    def post(self, request: Request) -> Response:
        serializer = LoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, tokens = authenticate_user(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )

        response_data = {
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": user,
        }
        output = TokenResponseSerializer(response_data)
        return Response(output.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Logout current user and blacklist the refresh token."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=LogoutRequestSerializer,
        responses={200: dict},
        description="Blacklist refresh token to invalidate user session.",
    )
    def post(self, request: Request) -> Response:
        serializer = LogoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        blacklist_refresh_token(refresh_token_str=serializer.validated_data["refresh"])
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


class UserMeView(APIView):
    """Retrieve and update authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: UserDetailSerializer},
        description="Retrieve the profile of the authenticated user.",
    )
    def get(self, request: Request) -> Response:
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=UserDetailSerializer,
        responses={200: UserDetailSerializer},
        description="Update profile details of the authenticated user.",
    )
    def patch(self, request: Request) -> Response:
        serializer = UserDetailSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Update password for the authenticated user."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ChangePasswordRequestSerializer,
        responses={200: dict},
        description="Change password for the authenticated user.",
    )
    def post(self, request: Request) -> Response:
        serializer = ChangePasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        change_user_password(
            user=request.user,
            old_password=serializer.validated_data["old_password"],
            new_password=serializer.validated_data["new_password"],
        )
        return Response(
            {"message": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


class DemoWorkspaceView(APIView):
    """Creates a ready-to-explore demo workspace session without signup."""

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        from apps.projects.demo import create_demo_workspace_session

        user, tokens, project_info = create_demo_workspace_session()
        output = TokenResponseSerializer(
            {"access": tokens["access"], "refresh": tokens["refresh"], "user": user}
        )
        data = dict(output.data)
        data["project"] = project_info
        return Response(data, status=status.HTTP_201_CREATED)


class UserAvatarUploadView(APIView):
    """Uploads an avatar image for the authenticated user and updates avatar_url."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        uploaded = request.FILES.get("avatar") or request.FILES.get("file")
        if not uploaded:
            raise ValidationError({"avatar": "Attach an image file to upload."})
        if uploaded.size > 2 * 1024 * 1024:
            raise ValidationError({"avatar": "Avatar image must be 2 MB or smaller."})

        content_type = getattr(uploaded, "content_type", "") or ""
        if not content_type.startswith("image/"):
            raise ValidationError({"avatar": "Only image files are supported."})

        ext = os.path.splitext(uploaded.name or "")[1].lower() or ".png"
        if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
            ext = ".png"

        saved_path = default_storage.save(
            f"avatars/{request.user.id}/{uuid.uuid4().hex}{ext}", uploaded
        )
        url = request.build_absolute_uri(default_storage.url(saved_path))
        request.user.avatar_url = url
        request.user.save(update_fields=["avatar_url", "updated_at"])
        return Response(UserDetailSerializer(request.user).data, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """Dispatches a password reset link without revealing whether the email exists."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = ForgotPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        User = get_user_model()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            origin = request.META.get("HTTP_ORIGIN") or request.build_absolute_uri("/").rstrip("/")
            reset_url = f"{origin}/reset-password?uid={uid}&token={token}"
            send_email_safely(
                to_email=user.email,
                subject="Reset your BugSense password",
                body=(
                    "We received a request to reset your BugSense password.\n\n"
                    f"Use this link to choose a new password:\n{reset_url}\n\n"
                    "If you did not request this, you can safely ignore this message."
                ),
            )

        return Response(
            {"message": "If an account exists for that email, reset instructions have been sent."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """Confirms a password reset token and sets the new password."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        User = get_user_model()
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=uid, is_active=True)
        except Exception as exc:
            raise ValidationError({"token": ["Invalid or expired reset link."]}) from exc

        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            raise ValidationError({"token": ["Invalid or expired reset link."]})

        new_password = serializer.validated_data["new_password"]
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": exc.messages}) from exc

        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        return Response({"message": "Password has been reset."}, status=status.HTTP_200_OK)
