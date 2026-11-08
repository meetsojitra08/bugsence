from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationUnreadCountSerializer,
)


class NotificationListView(generics.ListAPIView):
    """Lists notifications for the authenticated user, ordered with newest first."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user).select_related(
            "actor",
            "issue",
            "issue__project",
        )
        if self.request.query_params.get("unread", "").lower() in ("true", "1"):
            qs = qs.filter(read_at__isnull=True)
        return qs.order_by("-created_at")

    @extend_schema(
        summary="List user notifications",
        responses={200: NotificationSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class NotificationUnreadCountView(APIView):
    """Returns the unread notifications count for badge display."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get unread notifications count",
        responses={200: NotificationUnreadCountSerializer},
    )
    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            read_at__isnull=True,
        ).count()
        return Response({"count": count}, status=status.HTTP_200_OK)


class NotificationMarkReadView(APIView):
    """Marks a single notification as read."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark notification as read",
        responses={
            200: NotificationSerializer,
            404: OpenApiResponse(description="Notification not found"),
        },
    )
    def post(self, request, pk):
        notif = get_object_or_404(Notification, id=pk, recipient=request.user)
        if not notif.read_at:
            notif.read_at = timezone.now()
            notif.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notif).data, status=status.HTTP_200_OK)


class NotificationMarkAllReadView(APIView):
    """Marks all unread notifications as read for the authenticated user."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark all user notifications as read",
        responses={200: OpenApiResponse(description="All unread notifications marked as read")},
    )
    def post(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            read_at__isnull=True,
        ).update(read_at=timezone.now())
        return Response(
            {"marked_read_count": updated_count},
            status=status.HTTP_200_OK,
        )
