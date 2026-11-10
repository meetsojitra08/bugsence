from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.projects.analytics import (
    ProjectAnalyticsOverviewView,
    ProjectAnalyticsTrendsView,
    ProjectAnalyticsWorkloadView,
)
from apps.projects.integrations import (
    EmailInboundWebhookView,
    GitHubWebhookView,
    ProjectIntegrationDetailView,
    ProjectIntegrationsListView,
    PublicReportFormView,
    SentryWebhookView,
    SlackCommandWebhookView,
)
from apps.projects.today import ProjectTodayView
from apps.projects.views import (
    AcceptInviteView,
    DirectMemberDetailView,
    ProjectInviteViewSet,
    ProjectMemberViewSet,
    ProjectViewSet,
    PublicInviteDetailView,
)

router = SimpleRouter()
router.register(r"projects", ProjectViewSet, basename="project")

urlpatterns = [
    # Today action home
    path(
        "projects/<uuid:project_id>/today/",
        ProjectTodayView.as_view(),
        name="project-today",
    ),
    # Project Analytics endpoints
    path(
        "projects/<uuid:project_id>/analytics/overview/",
        ProjectAnalyticsOverviewView.as_view(),
        name="project-analytics-overview",
    ),
    path(
        "projects/<uuid:project_id>/analytics/trends/",
        ProjectAnalyticsTrendsView.as_view(),
        name="project-analytics-trends",
    ),
    path(
        "projects/<uuid:project_id>/analytics/workload/",
        ProjectAnalyticsWorkloadView.as_view(),
        name="project-analytics-workload",
    ),
    # Project Member management endpoints
    path(
        "projects/<uuid:project_id>/members/",
        ProjectMemberViewSet.as_view({"get": "list", "post": "create"}),
        name="project-members-list",
    ),
    path(
        "projects/<uuid:project_id>/members/<uuid:pk>/",
        ProjectMemberViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="project-members-detail",
    ),
    # Project Invites & Shareable Links
    path(
        "projects/<uuid:project_id>/invites/",
        ProjectInviteViewSet.as_view({"get": "list", "post": "create"}),
        name="project-invites-list",
    ),
    path(
        "projects/<uuid:project_id>/invites/<uuid:pk>/",
        ProjectInviteViewSet.as_view({"delete": "destroy"}),
        name="project-invites-detail",
    ),
    path(
        "projects/<uuid:project_id>/invites/<uuid:pk>/resend/",
        ProjectInviteViewSet.as_view({"post": "resend"}),
        name="project-invites-resend",
    ),
    path(
        "invites/<str:token>/",
        PublicInviteDetailView.as_view(),
        name="public-invite-detail",
    ),
    path(
        "invites/<str:token>/accept/",
        AcceptInviteView.as_view(),
        name="accept-invite",
    ),
    # Integrations & Webhooks
    path(
        "projects/<uuid:project_id>/integrations/",
        ProjectIntegrationsListView.as_view(),
        name="project-integrations-list",
    ),
    path(
        "projects/<uuid:project_id>/integrations/<str:provider>/",
        ProjectIntegrationDetailView.as_view(),
        name="project-integration-detail",
    ),
    path(
        "integrations/github/webhook/<str:project_key>/",
        GitHubWebhookView.as_view(),
        name="webhook-github",
    ),
    path(
        "integrations/slack/command/<str:project_key>/",
        SlackCommandWebhookView.as_view(),
        name="webhook-slack",
    ),
    path(
        "integrations/email/inbound/<str:project_key>/",
        EmailInboundWebhookView.as_view(),
        name="webhook-email-in",
    ),
    path(
        "integrations/sentry/webhook/<str:project_key>/",
        SentryWebhookView.as_view(),
        name="webhook-sentry",
    ),
    path(
        "public/report/<str:project_key>/",
        PublicReportFormView.as_view(),
        name="public-report-form",
    ),
    # Direct member endpoint: /api/v1/members/{id}/
    path(
        "members/<uuid:pk>/",
        DirectMemberDetailView.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="member-direct-detail",
    ),
    *router.urls,
]
