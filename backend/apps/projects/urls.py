from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.projects.views import DirectMemberDetailView, ProjectMemberViewSet, ProjectViewSet

router = SimpleRouter()
router.register(r"projects", ProjectViewSet, basename="project")

urlpatterns = [
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
    # Direct member endpoint: /api/v1/members/{id}/
    path(
        "members/<uuid:pk>/",
        DirectMemberDetailView.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="member-direct-detail",
    ),
    *router.urls,
]
