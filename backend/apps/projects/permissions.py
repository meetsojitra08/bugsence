from typing import Any
from uuid import UUID

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from apps.projects.models import Membership, Project, RoleChoices


class IsProjectMember(BasePermission):
    """
    Allows access only to authenticated users who are members of the project.
    """

    def has_permission(self, request: Request, view: Any) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False

        project_id = view.kwargs.get("project_id") or view.kwargs.get("pk")
        if not project_id:
            return True

        return Membership.objects.filter(
            project_id=project_id,
            user=request.user,
        ).exists()

    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        project_id: UUID | None = None
        if isinstance(obj, Project):
            project_id = obj.id
        elif isinstance(obj, Membership):
            project_id = obj.project_id
        elif hasattr(obj, "project_id"):
            project_id = obj.project_id

        if not project_id:
            return False

        return Membership.objects.filter(
            project_id=project_id,
            user=request.user,
        ).exists()


class IsProjectAdmin(BasePermission):
    """
    Allows access only to users with Admin or Owner role in the project.
    """

    def has_permission(self, request: Request, view: Any) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False

        project_id = view.kwargs.get("project_id") or view.kwargs.get("pk")
        if not project_id:
            return True

        return Membership.objects.filter(
            project_id=project_id,
            user=request.user,
            role__in=[RoleChoices.ADMIN, RoleChoices.OWNER],
        ).exists()

    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        project_id: UUID | None = None
        if isinstance(obj, Project):
            project_id = obj.id
        elif isinstance(obj, Membership):
            project_id = obj.project_id
        elif hasattr(obj, "project_id"):
            project_id = obj.project_id

        if not project_id:
            return False

        return Membership.objects.filter(
            project_id=project_id,
            user=request.user,
            role__in=[RoleChoices.ADMIN, RoleChoices.OWNER],
        ).exists()


class IsProjectOwner(BasePermission):
    """
    Allows access only to users with Owner role in the project.
    """

    def has_permission(self, request: Request, view: Any) -> bool:
        if not (request.user and request.user.is_authenticated):
            return False

        project_id = view.kwargs.get("project_id") or view.kwargs.get("pk")
        if not project_id:
            return True

        return Membership.objects.filter(
            project_id=project_id,
            user=request.user,
            role=RoleChoices.OWNER,
        ).exists()

    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        project_id: UUID | None = None
        if isinstance(obj, Project):
            project_id = obj.id
        elif isinstance(obj, Membership):
            project_id = obj.project_id
        elif hasattr(obj, "project_id"):
            project_id = obj.project_id

        if not project_id:
            return False

        return Membership.objects.filter(
            project_id=project_id,
            user=request.user,
            role=RoleChoices.OWNER,
        ).exists()
