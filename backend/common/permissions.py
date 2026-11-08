"""Base permission classes for BugSense API."""

from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated

__all__ = ["SAFE_METHODS", "BasePermission", "IsAuthenticated", "IsOwnerOrReadOnly"]


class IsOwnerOrReadOnly(BasePermission):
    """Custom permission to only allow owners of an object to edit it."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return hasattr(obj, "owner") and obj.owner == request.user
