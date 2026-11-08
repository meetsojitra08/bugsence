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
