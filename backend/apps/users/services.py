"""Business logic and services for user authentication and management."""

from typing import Any

from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User


def get_tokens_for_user(user: User) -> dict[str, str]:
    """Generate JWT access and refresh tokens for the given user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def register_user(
    *, email: str, password: str, full_name: str = "", **extra_fields: Any
) -> tuple[User, dict[str, str]]:
    """Register a new user, validate password, and return user with JWT tokens."""
    email = email.strip().lower()
    if User.objects.filter(email=email).exists():
        raise ValidationError({"email": ["A user with this email already exists."]})

    user_dummy = User(email=email, full_name=full_name)
    validate_password(password, user=user_dummy)

    user = User.objects.create_user(
        email=email,
        password=password,
        full_name=full_name,
        last_active_at=timezone.now(),
        **extra_fields,
    )
    tokens = get_tokens_for_user(user)
    return user, tokens


def authenticate_user(*, email: str, password: str) -> tuple[User, dict[str, str]]:
    """Authenticate user with generic error message to prevent email enumeration."""
    generic_error = "Invalid email or password."
    email = email.strip().lower()

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise AuthenticationFailed(generic_error) from None

    if not user.is_active:
        raise AuthenticationFailed(generic_error)

    if not user.check_password(password):
        raise AuthenticationFailed(generic_error)

    user.last_active_at = timezone.now()
    user.save(update_fields=["last_active_at"])
    tokens = get_tokens_for_user(user)
    return user, tokens


def change_user_password(*, user: User, old_password: str, new_password: str) -> None:
    """Validate current password and set a validated new password."""
    if not user.check_password(old_password):
        raise ValidationError({"old_password": ["Current password is incorrect."]})

    validate_password(new_password, user=user)
    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])


def blacklist_refresh_token(*, refresh_token_str: str) -> None:
    """Blacklist the provided refresh token to prevent further usage."""
    if not refresh_token_str:
        raise ValidationError({"refresh": ["Refresh token is required."]})
    try:
        token = RefreshToken(refresh_token_str)
        token.blacklist()
    except Exception as exc:
        raise ValidationError({"refresh": ["Invalid or expired refresh token."]}) from exc
