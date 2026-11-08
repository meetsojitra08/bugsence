"""Tests for API health check and core setup."""

import pytest
from rest_framework import status


@pytest.mark.django_db
def test_health_check_endpoint(api_client):
    """Ensure the health check returns 200 and healthy status."""
    response = api_client.get("/api/v1/health/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data == {
        "status": "healthy",
        "service": "BugSense AI API",
        "version": "1.0.0",
    }


@pytest.mark.django_db
def test_openapi_schema_endpoint(api_client):
    """Ensure the OpenAPI schema endpoint responds."""
    response = api_client.get("/api/schema/")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_standardized_error_format(api_client):
    """Ensure 404 responses conform to the standard error response shape."""
    response = api_client.get("/api/v1/non-existent-endpoint/")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    json_data = response.json()
    assert "error" in json_data
    assert json_data["error"]["code"] == "not_found"
