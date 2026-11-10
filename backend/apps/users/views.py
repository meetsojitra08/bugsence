"""API views for user authentication and user profile management."""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.users.serializers import (
    ChangePasswordRequestSerializer,
    LoginRequestSerializer,
    LogoutRequestSerializer,
    RegisterRequestSerializer,
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
