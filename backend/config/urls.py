"""BugSense URL Configuration."""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.views import AISummarizeView
from apps.projects.search import GlobalSearchView


class HealthCheckView(APIView):
    """Health check endpoint for deployment probes and uptime monitors."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "status": "healthy",
                "service": "BugSense AI API",
                "version": "1.0.0",
            }
        )


urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check
    path("api/v1/health/", HealthCheckView.as_view(), name="health_check"),
    # Users & Authentication
    path("api/v1/", include("apps.users.urls")),
    # Projects & Members
    path("api/v1/", include("apps.projects.urls")),
    # Issues & Labels
    path("api/v1/", include("apps.issues.urls")),
    # AI Features (Triage, Duplicates, Summarize)
    path("api/v1/ai/", include("apps.ai.urls")),
    path(
        "api/v1/issues/<uuid:issue_id>/ai/summarize/",
        AISummarizeView.as_view(),
        name="issue_ai_summarize",
    ),
    # Notifications
    path("api/v1/", include("apps.notifications.urls")),
    # Global Search
    path("api/v1/search/", GlobalSearchView.as_view(), name="global-search"),
    # OpenAPI Schema & Interactive Docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

handler404 = "common.exceptions.page_not_found_view"
handler500 = "common.exceptions.server_error_view"
