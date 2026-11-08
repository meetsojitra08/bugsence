from django.urls import path

from apps.issues.views import (
    IssueActivityView,
    IssueDetailViewSet,
    IssueRestoreView,
    LabelDetailView,
    ProjectIssueByNumberView,
    ProjectIssueViewSet,
    ProjectLabelViewSet,
)

urlpatterns = [
    # Project-scoped issue endpoints
    path(
        "projects/<uuid:project_id>/issues/",
        ProjectIssueViewSet.as_view({"get": "list", "post": "create"}),
        name="project-issues-list",
    ),
    # Project issue lookup by key/UUID and number: /api/v1/projects/{key}/issues/{number}/
    path(
        "projects/<str:project_identifier>/issues/<int:number>/",
        ProjectIssueByNumberView.as_view(),
        name="project-issue-by-number",
    ),
    # Direct issue detail, update and delete: /api/v1/issues/{id}/
    path(
        "issues/<uuid:pk>/",
        IssueDetailViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="issue-detail",
    ),
    # Restore soft-deleted issue: /api/v1/issues/{id}/restore/
    path(
        "issues/<uuid:pk>/restore/",
        IssueRestoreView.as_view(),
        name="issue-restore",
    ),
    # Issue activity history: /api/v1/issues/{id}/activity/
    path(
        "issues/<uuid:pk>/activity/",
        IssueActivityView.as_view(),
        name="issue-activity",
    ),
    # Project labels: /api/v1/projects/{project_id}/labels/
    path(
        "projects/<uuid:project_id>/labels/",
        ProjectLabelViewSet.as_view({"get": "list", "post": "create"}),
        name="project-labels-list",
    ),
    # Label detail: /api/v1/labels/{id}/
    path(
        "labels/<uuid:pk>/",
        LabelDetailView.as_view(),
        name="label-detail",
    ),
]
