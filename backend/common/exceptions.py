"""Common exceptions and error handlers for BugSense API."""

from typing import Any

from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def _format_details(data: Any) -> dict[str, Any]:
    return data if isinstance(data, dict) else {"detail": str(data)}


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Standardized error response handler conforming to BugSense architecture spec.

    Format:
    {
        "error": {
            "code": "error_code",
            "message": "Human readable message",
            "details": { ... }
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_code = "api_error"
        message = "An error occurred."
        details: dict[str, Any] = {}

        if response.status_code == status.HTTP_400_BAD_REQUEST:
            error_code = "validation_error"
            message = "Validation error in request payload."
            details = (
                response.data
                if isinstance(response.data, dict)
                else {"non_field_errors": response.data}
            )
        elif response.status_code == status.HTTP_401_UNAUTHORIZED:
            error_code = "authentication_failed"
            message = "Authentication credentials were not provided or are invalid."
            details = _format_details(response.data)
        elif response.status_code == status.HTTP_403_FORBIDDEN:
            error_code = "permission_denied"
            message = "You do not have permission to perform this action."
            details = _format_details(response.data)
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            error_code = "not_found"
            message = "The requested resource was not found."
            details = _format_details(response.data)
        elif response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            error_code = "throttled"
            message = "Request was throttled. Expected available in some time."
            details = _format_details(response.data)
        else:
            if isinstance(response.data, dict):
                details = response.data
                message = str(response.data.get("detail", message))
            else:
                details = {"detail": str(response.data)}

        response.data = {
            "error": {
                "code": error_code,
                "message": message,
                "details": details,
            }
        }

    return response


def page_not_found_view(request, exception=None):
    """Custom 404 handler returning JSON matching architecture error format."""
    return JsonResponse(
        {
            "error": {
                "code": "not_found",
                "message": "The requested resource or endpoint was not found.",
                "details": {"path": request.path},
            }
        },
        status=status.HTTP_404_NOT_FOUND,
    )


def server_error_view(request):
    """Custom 500 handler returning JSON matching architecture error format."""
    return JsonResponse(
        {
            "error": {
                "code": "server_error",
                "message": "An internal server error occurred.",
                "details": {},
            }
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
