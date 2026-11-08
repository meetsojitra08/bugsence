from django.urls import path

from apps.issues.views import (
    CommentDetailView,
    IssueActivityView,
    IssueCommentsView,
    IssueDetailViewSet,
    IssueMoveView,
    IssueRestoreView,
    LabelDetailView,
    ProjectBoardView,
    ProjectIssueByNumberView,
    ProjectIssueCommentsByNumberView,
    ProjectIssueTimelineByNumberView,
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
    # Project issue activity/timeline by key/UUID and number
    path(
        "projects/<str:project_identifier>/issues/<int:number>/activity/",
        ProjectIssueTimelineByNumberView.as_view(),
        name="project-issue-activity-by-number",
    ),
    # Project issue comments by key/UUID and number
    path(
        "projects/<str:project_identifier>/issues/<int:number>/comments/",
        ProjectIssueCommentsByNumberView.as_view(),
        name="project-issue-comments-by-number",
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
    # Move issue status/position on board: /api/v1/issues/{id}/move/
    path(
        "issues/<uuid:pk>/move/",
        IssueMoveView.as_view(),
        name="issue-move",
    ),
    # Kanban board column view: /api/v1/projects/{project_id}/board/
    path(
        "projects/<uuid:project_id>/board/",
        ProjectBoardView.as_view(),
        name="project-board",
    ),
    # Issue comments: /api/v1/issues/{id}/comments/
    path(
        "issues/<uuid:pk>/comments/",
        IssueCommentsView.as_view(),
        name="issue-comments",
    ),
    # Comment detail (patch/delete): /api/v1/comments/{id}/
    path(
        "comments/<uuid:pk>/",
        CommentDetailView.as_view(),
        name="comment-detail",
    ),
    # Issue activity/timeline history: /api/v1/issues/{id}/activity/
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
