"""Tests for authentication, token rotation, and profile endpoints."""

import pytest
from rest_framework import status

from apps.users.models import User
from tests.factories import UserFactory


@pytest.fixture
def test_user(db):
    return UserFactory(
        email="developer@bugsense.dev",
        password="ValidPassword123!",
        full_name="Alex Developer",
    )


@pytest.fixture
def auth_client(api_client, test_user):
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.mark.django_db
class TestRegistration:
    """Test suite for user registration."""

    url = "/api/v1/auth/register/"

    def test_register_success(self, api_client):
        payload = {
            "email": "new.user@bugsense.dev",
            "password": "SecurePassword123!",
            "full_name": "New User",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["email"] == "new.user@bugsense.dev"
        assert response.data["user"]["full_name"] == "New User"
        assert User.objects.filter(email="new.user@bugsense.dev").exists()

    def test_register_duplicate_email(self, api_client, test_user):
        payload = {
            "email": test_user.email,
            "password": "AnotherPassword123!",
            "full_name": "Imposter User",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data
        assert response.data["error"]["code"] == "validation_error"
        assert "email" in response.data["error"]["details"]

    def test_register_short_password(self, api_client):
        payload = {
            "email": "short@bugsense.dev",
            "password": "short",
            "full_name": "Short Pwd",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "validation_error"


@pytest.mark.django_db
class TestLogin:
    """Test suite for user login."""

    url = "/api/v1/auth/login/"

    def test_login_success(self, api_client, test_user):
        payload = {
            "email": "developer@bugsense.dev",
            "password": "ValidPassword123!",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["id"] == str(test_user.id)

    def test_login_incorrect_password(self, api_client, test_user):
        payload = {
            "email": test_user.email,
            "password": "WrongPassword123!",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["error"]["code"] == "authentication_failed"
        assert response.data["error"]["details"]["detail"] == "Invalid email or password."

    def test_login_nonexistent_email(self, api_client):
        payload = {
            "email": "nonexistent@bugsense.dev",
            "password": "SomePassword123!",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["error"]["code"] == "authentication_failed"
        # Generic message: must not disclose whether email exists
        assert response.data["error"]["details"]["detail"] == "Invalid email or password."

    def test_login_inactive_user(self, api_client):
        inactive_user = UserFactory(
            email="inactive@bugsense.dev",
            password="ValidPassword123!",
            is_active=False,
        )
        payload = {
            "email": inactive_user.email,
            "password": "ValidPassword123!",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["error"]["details"]["detail"] == "Invalid email or password."


@pytest.mark.django_db
class TestTokenLifecycle:
    """Test suite for token refresh and blacklisting."""

    def test_token_refresh_and_rotation(self, api_client, test_user):
        # First obtain tokens via login
        login_resp = api_client.post(
            "/api/v1/auth/login/",
            {"email": test_user.email, "password": "ValidPassword123!"},
            format="json",
        )
        refresh_token = login_resp.data["refresh"]

        # Call refresh endpoint
        refresh_resp = api_client.post(
            "/api/v1/auth/refresh/",
            {"refresh": refresh_token},
            format="json",
        )
        assert refresh_resp.status_code == status.HTTP_200_OK
        assert "access" in refresh_resp.data
        # Token rotation should return a new refresh token
        assert "refresh" in refresh_resp.data

    def test_logout_blacklists_refresh_token(self, api_client, test_user):
        # Login to obtain fresh tokens
        login_resp = api_client.post(
            "/api/v1/auth/login/",
            {"email": test_user.email, "password": "ValidPassword123!"},
            format="json",
        )
        access_token = login_resp.data["access"]
        refresh_token = login_resp.data["refresh"]

        # Logout authenticated with Bearer access token
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_resp = api_client.post(
            "/api/v1/auth/logout/",
            {"refresh": refresh_token},
            format="json",
        )
        assert logout_resp.status_code == status.HTTP_200_OK

        # Attempt to use the blacklisted refresh token
        retry_refresh = api_client.post(
            "/api/v1/auth/refresh/",
            {"refresh": refresh_token},
            format="json",
        )
        assert retry_refresh.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserProfile:
    """Test suite for profile endpoints."""

    url = "/api/v1/users/me/"

    def test_profile_requires_authentication(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_profile_authenticated(self, auth_client, test_user):
        response = auth_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == test_user.email
        assert response.data["full_name"] == test_user.full_name

    def test_patch_profile(self, auth_client, test_user):
        payload = {
            "full_name": "Updated Name",
            "avatar_url": "https://avatar.example.com/photo.png",
        }
        response = auth_client.patch(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["full_name"] == "Updated Name"
        assert response.data["avatar_url"] == "https://avatar.example.com/photo.png"

        test_user.refresh_from_db()
        assert test_user.full_name == "Updated Name"


@pytest.mark.django_db
class TestChangePassword:
    """Test suite for changing password."""

    url = "/api/v1/users/me/change-password/"

    def test_change_password_success(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        payload = {
            "old_password": "ValidPassword123!",
            "new_password": "BrandNewPassword2026!",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK

        # Verify old password fails
        api_client.logout()
        failed_login = api_client.post(
            "/api/v1/auth/login/",
            {"email": test_user.email, "password": "ValidPassword123!"},
            format="json",
        )
        assert failed_login.status_code == status.HTTP_401_UNAUTHORIZED

        # Verify new password succeeds
        success_login = api_client.post(
            "/api/v1/auth/login/",
            {"email": test_user.email, "password": "BrandNewPassword2026!"},
            format="json",
        )
        assert success_login.status_code == status.HTTP_200_OK

    def test_change_password_invalid_old_password(self, auth_client):
        payload = {
            "old_password": "IncorrectOldPassword!",
            "new_password": "BrandNewPassword2026!",
        }
        response = auth_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "old_password" in response.data["error"]["details"]
