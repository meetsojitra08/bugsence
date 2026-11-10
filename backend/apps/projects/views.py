from uuid import UUID

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects import selectors, services
from apps.projects.models import InviteStatus, Membership, Project, ProjectInvite, RoleChoices
from apps.projects.serializers import (
    MembershipCreateSerializer,
    MembershipSerializer,
    MembershipUpdateSerializer,
    ProjectCreateSerializer,
    ProjectDetailSerializer,
    ProjectInviteCreateSerializer,
    ProjectInviteSerializer,
    ProjectListSerializer,
    ProjectUpdateSerializer,
)


@extend_schema_view(
    list=extend_schema(summary="List accessible projects"),
    retrieve=extend_schema(summary="Retrieve project details"),
    create=extend_schema(summary="Create a new project"),
    partial_update=extend_schema(summary="Update project details"),
    destroy=extend_schema(summary="Delete a project"),
)
class ProjectViewSet(viewsets.ModelViewSet):
    """
    Project CRUD operations scoped strictly to projects where the requesting
    user holds a valid membership. Non-members receive a 404 response.
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    queryset = Project.objects.none()

    def get_queryset(self):
        return selectors.get_user_projects(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        if self.action in ["retrieve"]:
            return ProjectDetailSerializer
        if self.action == "create":
            return ProjectCreateSerializer
        return ProjectUpdateSerializer

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            project = services.create_project(
                user=request.user,
                name=serializer.validated_data["name"],
                key=serializer.validated_data.get("key", ""),
                description=serializer.validated_data.get("description", ""),
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        output_serializer = ProjectDetailSerializer(
            project,
            context={"request": request},
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request: Request, *args, **kwargs) -> Response:
        project = self.get_object()

        # Check role: viewer and regular member cannot update project settings
        user_role = selectors.get_user_role_in_project(
            project_id=project.id,
            user=request.user,
        )
        if user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project admins or owners can update project settings.")

        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = services.update_project(
                project=project,
                name=data.get("name"),
                description=data.get("description"),
                archived=data.get("archived"),
                default_assignee_id=data.get("default_assignee_id"),
                has_default_assignee="default_assignee_id" in data,
                triage_rotation_enabled=data.get("triage_rotation_enabled"),
                triage_rotation_cadence=data.get("triage_rotation_cadence"),
                current_triager_id=data.get("current_triager_id"),
                has_current_triager="current_triager_id" in data,
                ai_auto_triage=data.get("ai_auto_triage"),
                ai_confidence_threshold=data.get("ai_confidence_threshold"),
                ai_priority_rules=data.get("ai_priority_rules"),
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        output_serializer = ProjectDetailSerializer(
            updated,
            context={"request": request},
        )
        return Response(output_serializer.data)

    def destroy(self, request: Request, *args, **kwargs) -> Response:
        project = self.get_object()

        # Check role: only owner can delete the project
        user_role = selectors.get_user_role_in_project(
            project_id=project.id,
            user=request.user,
        )
        if user_role != RoleChoices.OWNER:
            raise PermissionDenied("Only the project owner can delete this project.")

        services.delete_project(project=project)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectMemberViewSet(viewsets.GenericViewSet):
    """
    Project member management endpoints:
    - GET /projects/{project_id}/members (any member)
    - POST /projects/{project_id}/members (admin or owner)
    - PATCH /projects/{project_id}/members/{id} (admin or owner)
    - DELETE /projects/{project_id}/members/{id} (admin, owner, or self)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MembershipSerializer

    def get_serializer_class(self):
        if self.action == "create":
            return MembershipCreateSerializer
        if self.action == "partial_update":
            return MembershipUpdateSerializer
        return MembershipSerializer

    def _get_project(self, project_id: UUID) -> Project:
        project = selectors.get_project_for_user(
            project_id=project_id,
            user=self.request.user,
        )
        if not project:
            raise NotFound("Project not found.")
        return project

    def list(self, request: Request, project_id: UUID) -> Response:
        project = self._get_project(project_id)
        members = selectors.get_project_members(project_id=project.id)
        serializer = MembershipSerializer(members, many=True)
        return Response(serializer.data)

    def create(self, request: Request, project_id: UUID) -> Response:
        project = self._get_project(project_id)

        user_role = selectors.get_user_role_in_project(
            project_id=project.id,
            user=request.user,
        )
        if user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project admins or owners can invite members.")

        serializer = MembershipCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Admins may manage members and viewers, but only an owner may grant ownership.
        requested_role = serializer.validated_data["role"]
        if requested_role == RoleChoices.OWNER and user_role != RoleChoices.OWNER:
            raise PermissionDenied("Only a project owner can grant the owner role.")

        try:
            membership = services.add_member(
                project=project,
                email=serializer.validated_data["email"],
                role=requested_role,
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        output_serializer = MembershipSerializer(membership)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request: Request, project_id: UUID, pk: UUID) -> Response:
        project = self._get_project(project_id)

        user_role = selectors.get_user_role_in_project(
            project_id=project.id,
            user=request.user,
        )
        if user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project admins or owners can update member roles.")

        serializer = MembershipUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = Membership.objects.filter(id=pk, project=project).first()
        if not target:
            raise NotFound("Member not found in this project.")

        new_role = serializer.validated_data["role"]
        actor_is_owner = user_role == RoleChoices.OWNER
        if target.role == RoleChoices.OWNER and not actor_is_owner:
            raise PermissionDenied("Only a project owner can change another owner's role.")
        if new_role == RoleChoices.OWNER and not actor_is_owner:
            raise PermissionDenied("Only a project owner can grant the owner role.")

        try:
            updated = services.update_member_role(
                project=project,
                membership_id=pk,
                new_role=new_role,
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        output_serializer = MembershipSerializer(updated)
        return Response(output_serializer.data)

    def destroy(self, request: Request, project_id: UUID, pk: UUID) -> Response:
        project = self._get_project(project_id)

        target_membership = Membership.objects.filter(id=pk, project=project).first()
        if not target_membership:
            raise NotFound("Member not found in this project.")

        user_role = selectors.get_user_role_in_project(
            project_id=project.id,
            user=request.user,
        )

        is_self_removal = target_membership.user_id == request.user.id
        is_admin_or_owner = user_role in [RoleChoices.ADMIN, RoleChoices.OWNER]

        if target_membership.role == RoleChoices.OWNER and user_role != RoleChoices.OWNER:
            raise PermissionDenied("Only a project owner can remove another owner.")
        if not (is_self_removal or is_admin_or_owner):
            raise PermissionDenied("You do not have permission to remove this member.")

        try:
            services.remove_member(project=project, membership_id=pk)
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(status=status.HTTP_204_NO_CONTENT)


class DirectMemberDetailView(viewsets.GenericViewSet):
    """
    Direct member detail endpoint supporting PATCH/DELETE /members/{id}
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MembershipUpdateSerializer

    def _get_membership_and_check_permission(
        self, request: Request, pk: UUID, require_admin: bool = False
    ) -> tuple[Project, Membership]:
        membership = Membership.objects.select_related("project").filter(id=pk).first()
        if not membership:
            raise NotFound("Membership not found.")

        project = membership.project
        # Verify user is a member of the project
        user_role = selectors.get_user_role_in_project(
            project_id=project.id,
            user=request.user,
        )
        if not user_role:
            raise NotFound("Membership not found.")

        if require_admin and user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project admins or owners can perform this action.")

        return project, membership

    def partial_update(self, request: Request, pk: UUID) -> Response:
        project, membership = self._get_membership_and_check_permission(
            request, pk, require_admin=True
        )

        serializer = MembershipUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        actor_role = selectors.get_user_role_in_project(
            project_id=project.id,
            user=request.user,
        )
        new_role = serializer.validated_data["role"]
        if membership.role == RoleChoices.OWNER and actor_role != RoleChoices.OWNER:
            raise PermissionDenied("Only a project owner can change another owner's role.")
        if new_role == RoleChoices.OWNER and actor_role != RoleChoices.OWNER:
            raise PermissionDenied("Only a project owner can grant the owner role.")

        try:
            updated = services.update_member_role(
                project=project,
                membership_id=membership.id,
                new_role=new_role,
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        output_serializer = MembershipSerializer(updated)
        return Response(output_serializer.data)

    def destroy(self, request: Request, pk: UUID) -> Response:
        membership = Membership.objects.select_related("project").filter(id=pk).first()
        if not membership:
            raise NotFound("Membership not found.")

        project = membership.project
        user_role = selectors.get_user_role_in_project(
            project_id=project.id,
            user=request.user,
        )
        if not user_role:
            raise NotFound("Membership not found.")

        is_self_removal = membership.user_id == request.user.id
        is_admin_or_owner = user_role in [RoleChoices.ADMIN, RoleChoices.OWNER]

        if membership.role == RoleChoices.OWNER and user_role != RoleChoices.OWNER:
            raise PermissionDenied("Only a project owner can remove another owner.")
        if not (is_self_removal or is_admin_or_owner):
            raise PermissionDenied("You do not have permission to remove this member.")

        try:
            services.remove_member(project=project, membership_id=membership.id)
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectInviteViewSet(viewsets.GenericViewSet):
    """Manage pending email invites and shareable invite links for a project."""

    permission_classes = [IsAuthenticated]
    serializer_class = ProjectInviteSerializer

    def _get_project(self, project_id: UUID) -> Project:
        project = selectors.get_project_for_user(project_id=project_id, user=self.request.user)
        if not project:
            raise NotFound("Project not found.")
        return project

    def list(self, request: Request, project_id: UUID) -> Response:
        project = self._get_project(project_id)
        invites = ProjectInvite.objects.filter(
            project=project,
            status=InviteStatus.PENDING,
        ).select_related("invited_by")
        return Response(ProjectInviteSerializer(invites, many=True).data)

    def create(self, request: Request, project_id: UUID) -> Response:
        project = self._get_project(project_id)
        user_role = selectors.get_user_role_in_project(project_id=project.id, user=request.user)
        if user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project owners or admins can send invites.")

        serializer = ProjectInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        requested_role = serializer.validated_data["role"]
        if requested_role == RoleChoices.OWNER and user_role != RoleChoices.OWNER:
            raise PermissionDenied("Only a project owner can invite another owner.")

        origin = request.META.get("HTTP_ORIGIN", "")
        try:
            invite = services.create_project_invite(
                project=project,
                invited_by=request.user,
                email=serializer.validated_data.get("email", ""),
                role=requested_role,
                invite_url_base=origin,
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(ProjectInviteSerializer(invite).data, status=status.HTTP_201_CREATED)

    def resend(self, request: Request, project_id: UUID, pk: UUID) -> Response:
        project = self._get_project(project_id)
        user_role = selectors.get_user_role_in_project(project_id=project.id, user=request.user)
        if user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project owners or admins can resend invites.")

        invite = ProjectInvite.objects.filter(id=pk, project=project).first()
        if not invite:
            raise NotFound("Invite not found.")

        origin = request.META.get("HTTP_ORIGIN", "")
        try:
            updated = services.resend_project_invite(invite=invite, invite_url_base=origin)
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc
        return Response(ProjectInviteSerializer(updated).data)

    def destroy(self, request: Request, project_id: UUID, pk: UUID) -> Response:
        project = self._get_project(project_id)
        user_role = selectors.get_user_role_in_project(project_id=project.id, user=request.user)
        if user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project owners or admins can revoke invites.")

        invite = ProjectInvite.objects.filter(id=pk, project=project).first()
        if not invite:
            raise NotFound("Invite not found.")

        services.revoke_project_invite(invite=invite)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicInviteDetailView(APIView):
    """Public metadata for an invite link so unauthenticated visitors see project & role."""

    permission_classes = [AllowAny]

    def get(self, request: Request, token: str) -> Response:
        invite = (
            ProjectInvite.objects.select_related("project", "invited_by")
            .filter(token=token)
            .first()
        )
        if not invite:
            raise NotFound("Invite link not found.")
        expired = bool(invite.expires_at and invite.expires_at < timezone.now())
        return Response(
            {
                "project_name": invite.project.name,
                "project_key": invite.project.key,
                "email": invite.email,
                "role": invite.role,
                "status": "expired" if expired else invite.status,
                "invited_by": (
                    invite.invited_by.display_name if invite.invited_by else "A teammate"
                ),
            }
        )


class AcceptInviteView(APIView):
    """Accepts a project invite link for the currently authenticated user."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, token: str) -> Response:
        try:
            membership = services.accept_project_invite(token=token, user=request.user)
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc
        return Response(
            {
                "project_id": str(membership.project_id),
                "project_key": membership.project.key,
                "project_name": membership.project.name,
                "role": membership.role,
            }
        )
