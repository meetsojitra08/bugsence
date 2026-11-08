"""Global pytest fixtures and configurations."""

import pytest
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def relaxed_throttles_for_tests(settings):
    """Prevent 429 rate limit errors during test execution."""
    rf_settings = settings.REST_FRAMEWORK.copy()
    rf_settings["DEFAULT_THROTTLE_RATES"] = {
        "anon": "1000/minute",
        "user": "1000/minute",
        "auth": "1000/minute",
    }
    settings.REST_FRAMEWORK = rf_settings


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    """A standard authenticated user for test cases."""
    from tests.factories import UserFactory

    return UserFactory(
        email="developer@bugsense.dev",
        password="ValidPassword123!",
        full_name="Alex Developer",
    )


@pytest.fixture
def auth_client(api_client, user):
    """APIClient pre-authenticated with the default user."""
    api_client.force_authenticate(user=user)
    return api_client
