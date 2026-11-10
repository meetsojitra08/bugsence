from uuid import UUID

from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.issues import selectors, services
from apps.issues.models import Issue, Label
from apps.issues.serializers import (
    CommentCreateSerializer,
    CommentSerializer,
    CommentUpdateSerializer,
    IssueCreateSerializer,
    IssueDetailSerializer,
    IssueListSerializer,
    IssueMoveSerializer,
    IssueUpdateSerializer,
    LabelCreateSerializer,
    LabelSerializer,
    ProjectBoardSerializer,
    TimelineItemSerializer,
)
from apps.projects.models import Membership, Project, RoleChoices
from apps.projects.selectors import get_project_for_user, get_user_role_in_project


@extend_schema_view(
    list=extend_schema(
        summary="List issues in project",
        parameters=[
            OpenApiParameter(
                name="status",
                type=str,
                description="Filter by status (comma-separated or single)",
            ),
            OpenApiParameter(
                name="priority",
                type=str,
                description="Filter by priority (comma-separated or single)",
            ),
            OpenApiParameter(name="severity", type=str, description="Filter by severity"),
            OpenApiParameter(name="type", type=str, description="Filter by issue type"),
            OpenApiParameter(
                name="assignee",
                type=str,
                description="Filter by assignee UUID or 'unassigned'",
            ),
            OpenApiParameter(name="label", type=str, description="Filter by label name"),
            OpenApiParameter(
                name="overdue",
                type=bool,
                description="When true, show past-due issues that are still open",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                description="Search query across title, description, or number",
            ),
            OpenApiParameter(
                name="ordering",
                type=str,
                description="Ordering field (e.g. -created_at, priority)",
            ),
        ],
        responses={200: IssueListSerializer(many=True)},
    ),
    create=extend_schema(
        summary="Create a new issue in project",
        request=IssueCreateSerializer,
        responses={201: IssueDetailSerializer},
    ),
)
class ProjectIssueViewSet(viewsets.GenericViewSet):
    """
    Project-scoped issue listing and creation.
    Non-members receive a 404 response.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = IssueListSerializer

    def get_serializer_class(self):
        if self.action == "create":
            return IssueCreateSerializer
        return IssueListSerializer

    def _get_project(self, project_id: UUID) -> Project:
        project = get_project_for_user(project_id=project_id, user=self.request.user)
        if not project:
            raise NotFound("Project not found.")
        return project

    def list(self, request: Request, project_id: UUID) -> Response:
        project = self._get_project(project_id)
        issues = selectors.get_project_issues(
            project_id=project.id,
            user=request.user,
            status=request.query_params.get("status"),
            priority=request.query_params.get("priority"),
            severity=request.query_params.get("severity"),
            type=request.query_params.get("type"),
            assignee_id=request.query_params.get("assignee"),
            label_name=request.query_params.get("label"),
            search=request.query_params.get("search"),
            ordering=request.query_params.get("ordering"),
            overdue=request.query_params.get("overdue") == "true",
        )
        page = self.paginate_queryset(issues)
        if page is not None:
            serializer = IssueListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = IssueListSerializer(issues, many=True)
        return Response(serializer.data)

    def create(self, request: Request, project_id: UUID) -> Response:
        project = self._get_project(project_id)

        user_role = get_user_role_in_project(project_id=project.id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot create issues.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        assignee = None
        if data.get("assignee_id"):
            assignee_membership = (
                Membership.objects.filter(project_id=project.id, user_id=data["assignee_id"])
                .select_related("user")
                .first()
            )
            if not assignee_membership:
                raise ValidationError({"assignee_id": "Assignee must be a member of this project."})
            assignee = assignee_membership.user

        labels = []
        if data.get("label_ids"):
            labels = list(Label.objects.filter(project_id=project.id, id__in=data["label_ids"]))
            if len(labels) != len(data["label_ids"]):
                raise ValidationError(
                    {"label_ids": "One or more labels do not belong to this project."}
                )

        try:
            issue = services.create_issue(
                project=project,
                reporter=request.user,
                title=data["title"],
                description=data.get("description", ""),
                steps_to_reproduce=data.get("steps_to_reproduce", ""),
                expected=data.get("expected", ""),
                actual=data.get("actual", ""),
                environment=data.get("environment", ""),
                status=data.get("status"),
                priority=data.get("priority"),
                severity=data.get("severity"),
                type=data.get("type"),
                assignee=assignee,
                labels=labels,
                due_date=data.get("due_date"),
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(IssueDetailSerializer(issue).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    retrieve=extend_schema(
        summary="Retrieve issue detail",
        responses={200: IssueDetailSerializer},
    ),
    partial_update=extend_schema(
        summary="Partial update of issue fields",
        request=IssueUpdateSerializer,
        responses={200: IssueDetailSerializer},
    ),
    destroy=extend_schema(
        summary="Soft delete an issue",
        responses={204: None},
    ),
)
class IssueDetailViewSet(viewsets.GenericViewSet):
    """
    Issue detail, update, delete, and restore endpoints.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = IssueDetailSerializer

    def get_serializer_class(self):
        if self.action == "partial_update":
            return IssueUpdateSerializer
        return IssueDetailSerializer

    def _get_issue(self, issue_id: UUID) -> Issue:
        issue = selectors.get_issue_for_user(issue_id=issue_id, user=self.request.user)
        if not issue:
            raise NotFound("Issue not found.")
        return issue

    def retrieve(self, request: Request, pk: UUID) -> Response:
        issue = self._get_issue(pk)
        return Response(IssueDetailSerializer(issue).data)

    def partial_update(self, request: Request, pk: UUID) -> Response:
        issue = self._get_issue(pk)

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot update issues.")

        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_kwargs = {}
        for field in [
            "title",
            "description",
            "steps_to_reproduce",
            "expected",
            "actual",
            "environment",
            "status",
            "priority",
            "severity",
            "type",
            "due_date",
            "position",
        ]:
            if field in data:
                update_kwargs[field] = data[field]

        if "assignee_id" in data:
            if data["assignee_id"] is None:
                update_kwargs["assignee"] = None
            else:
                membership = (
                    Membership.objects.filter(
                        project_id=issue.project_id, user_id=data["assignee_id"]
                    )
                    .select_related("user")
                    .first()
                )
                if not membership:
                    raise ValidationError(
                        {"assignee_id": "Assignee must be a member of this project."}
                    )
                update_kwargs["assignee"] = membership.user

        if "label_ids" in data:
            label_ids = data["label_ids"]
            labels = list(Label.objects.filter(project_id=issue.project_id, id__in=label_ids))
            if len(labels) != len(label_ids):
                raise ValidationError(
                    {"label_ids": "One or more labels do not belong to this project."}
                )
            update_kwargs["labels"] = labels

        try:
            updated_issue = services.update_issue(
                issue=issue,
                actor=request.user,
                **update_kwargs,
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(IssueDetailSerializer(updated_issue).data)

    def destroy(self, request: Request, pk: UUID) -> Response:
        issue = self._get_issue(pk)

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot delete issues.")
        if user_role == RoleChoices.MEMBER and issue.reporter_id != request.user.id:
            raise PermissionDenied("Members can only delete issues they reported.")

        services.delete_issue(issue=issue, actor=request.user, soft_delete=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class IssueRestoreView(APIView):
    """Endpoint to restore soft-deleted issues for undo support."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Restore a soft-deleted issue",
        request=None,
        responses={200: IssueDetailSerializer},
    )
    def post(self, request: Request, pk: UUID) -> Response:
        issue = Issue.all_objects.filter(
            id=pk,
            project__memberships__user=request.user,
        ).first()
        if not issue:
            raise NotFound("Issue not found.")

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot restore issues.")
        if user_role == RoleChoices.MEMBER and issue.reporter_id != request.user.id:
            raise PermissionDenied("Members can only restore issues they reported.")

        try:
            restored = services.restore_issue(issue_id=pk, actor=request.user)
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(IssueDetailSerializer(restored).data)


class ProjectIssueByNumberView(APIView):
    """
    Lookup an issue by project key/UUID and sequential number.
    Enables route: /p/:key/issues/:number
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Lookup issue by project identifier and issue number",
        responses={200: IssueDetailSerializer},
    )
    def get(self, request: Request, project_identifier: str, number: int) -> Response:
        project_filter = {"memberships__user": request.user}
        try:
            uuid_obj = UUID(project_identifier)
            project_filter["id"] = uuid_obj
        except ValueError:
            project_filter["key__iexact"] = project_identifier

        project = Project.objects.filter(**project_filter).first()
        if not project:
            raise NotFound("Project not found.")

        issue = (
            Issue.objects.filter(project=project, number=number)
            .select_related("project", "reporter", "assignee", "duplicate_of")
            .prefetch_related("labels")
            .first()
        )
        if not issue:
            raise NotFound("Issue not found.")

        return Response(IssueDetailSerializer(issue).data)


@extend_schema_view(
    list=extend_schema(
        summary="List labels in project",
        responses={200: LabelSerializer(many=True)},
    ),
    create=extend_schema(
        summary="Create a new label in project",
        request=LabelCreateSerializer,
        responses={201: LabelSerializer},
    ),
)
class ProjectLabelViewSet(viewsets.GenericViewSet):
    """Project-scoped label listing and creation."""

    permission_classes = [IsAuthenticated]
    serializer_class = LabelSerializer

    def get_serializer_class(self):
        if self.action == "create":
            return LabelCreateSerializer
        return LabelSerializer

    def _get_project(self, project_id: UUID) -> Project:
        project = get_project_for_user(project_id=project_id, user=self.request.user)
        if not project:
            raise NotFound("Project not found.")
        return project

    def list(self, request: Request, project_id: UUID) -> Response:
        project = self._get_project(project_id)
        labels = selectors.get_project_labels(project_id=project.id, user=request.user)
        return Response(LabelSerializer(labels, many=True).data)

    def create(self, request: Request, project_id: UUID) -> Response:
        project = self._get_project(project_id)

        user_role = get_user_role_in_project(project_id=project.id, user=request.user)
        if user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project admins or owners can create labels.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            label = services.create_label(
                project=project,
                name=serializer.validated_data["name"],
                color=serializer.validated_data.get("color", "#6366F1"),
                description=serializer.validated_data.get("description", ""),
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(LabelSerializer(label).data, status=status.HTTP_201_CREATED)


class LabelDetailView(APIView):
    """Label deletion endpoint."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Delete a label",
        responses={204: None},
    )
    def delete(self, request: Request, pk: UUID) -> Response:
        label = Label.objects.filter(
            id=pk,
            project__memberships__user=request.user,
        ).first()
        if not label:
            raise NotFound("Label not found.")

        user_role = get_user_role_in_project(project_id=label.project_id, user=request.user)
        if user_role not in [RoleChoices.ADMIN, RoleChoices.OWNER]:
            raise PermissionDenied("Only project admins or owners can delete labels.")

        label.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IssueActivityView(APIView):
    """List unified activity timeline (activities + comments) for an issue."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List activity log and comment timeline entries for an issue",
        responses={200: TimelineItemSerializer(many=True)},
    )
    def get(self, request: Request, pk: UUID) -> Response:
        issue = selectors.get_issue_for_user(issue_id=pk, user=request.user)
        if not issue:
            raise NotFound("Issue not found.")

        timeline = selectors.get_issue_timeline(issue_id=pk, user=request.user)
        return Response(TimelineItemSerializer(timeline, many=True).data)


class IssueMoveView(APIView):
    """Move an issue to a new status and/or update its board position."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Move issue status and position on kanban board",
        request=IssueMoveSerializer,
        responses={200: IssueDetailSerializer},
    )
    def post(self, request: Request, pk: UUID) -> Response:
        issue = selectors.get_issue_for_user(issue_id=pk, user=request.user)
        if not issue:
            raise NotFound("Issue not found.")

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot move issues.")

        serializer = IssueMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            moved = services.move_issue(
                issue=issue,
                actor=request.user,
                status=serializer.validated_data["status"],
                before_id=serializer.validated_data.get("before_id"),
                after_id=serializer.validated_data.get("after_id"),
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(IssueDetailSerializer(moved).data)


class ProjectBoardView(APIView):
    """Retrieve issues for a project grouped by kanban board column."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Retrieve project kanban board issues grouped by status",
        parameters=[
            OpenApiParameter(name="priority", type=str, description="Filter by priority"),
            OpenApiParameter(
                name="assignee",
                type=str,
                description="Filter by assignee UUID or 'unassigned'",
            ),
            OpenApiParameter(name="label", type=str, description="Filter by label name"),
            OpenApiParameter(name="search", type=str, description="Search query"),
        ],
        responses={200: ProjectBoardSerializer},
    )
    def get(self, request: Request, project_id: UUID) -> Response:
        board = selectors.get_project_board_issues(
            project_id=project_id,
            user=request.user,
            priority=request.query_params.get("priority"),
            assignee_id=request.query_params.get("assignee"),
            label_name=request.query_params.get("label"),
            search=request.query_params.get("search"),
        )
        if board is None:
            raise NotFound("Project not found.")

        columns_data = {}
        counts_data = {}
        for status_key, issues in board.items():
            columns_data[status_key] = IssueListSerializer(issues, many=True).data
            counts_data[status_key] = len(issues)

        return Response(
            {
                "columns": columns_data,
                "counts": counts_data,
            }
        )


class IssueCommentsView(APIView):
    """List comments and create new comment on an issue."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List comments for an issue",
        responses={200: CommentSerializer(many=True)},
    )
    def get(self, request: Request, pk: UUID) -> Response:
        comments = selectors.get_issue_comments(issue_id=pk, user=request.user)
        if comments is None:
            raise NotFound("Issue not found.")
        return Response(CommentSerializer(comments, many=True).data)

    @extend_schema(
        summary="Create a comment on an issue",
        request=CommentCreateSerializer,
        responses={201: CommentSerializer},
    )
    def post(self, request: Request, pk: UUID) -> Response:
        issue = selectors.get_issue_for_user(issue_id=pk, user=request.user)
        if not issue:
            raise NotFound("Issue not found.")

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot create comments.")

        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            comment = services.create_comment(
                issue=issue,
                author=request.user,
                body=serializer.validated_data["body"],
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class CommentDetailView(APIView):
    """Update or delete an existing comment."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Update a comment",
        request=CommentUpdateSerializer,
        responses={200: CommentSerializer},
    )
    def patch(self, request: Request, pk: UUID) -> Response:
        comment = selectors.get_comment_for_user(comment_id=pk, user=request.user)
        if not comment:
            raise NotFound("Comment not found.")

        user_role = get_user_role_in_project(project_id=comment.issue.project_id, user=request.user)
        is_author = comment.author_id == request.user.id
        is_admin_or_owner = user_role in [RoleChoices.ADMIN, RoleChoices.OWNER]

        if not (is_author or is_admin_or_owner):
            raise PermissionDenied("You do not have permission to edit this comment.")

        serializer = CommentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = services.update_comment(
                comment=comment,
                actor=request.user,
                body=serializer.validated_data["body"],
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(CommentSerializer(updated).data)

    @extend_schema(
        summary="Delete a comment",
        responses={204: None},
    )
    def delete(self, request: Request, pk: UUID) -> Response:
        comment = selectors.get_comment_for_user(comment_id=pk, user=request.user)
        if not comment:
            raise NotFound("Comment not found.")

        user_role = get_user_role_in_project(project_id=comment.issue.project_id, user=request.user)
        is_author = comment.author_id == request.user.id
        is_admin_or_owner = user_role in [RoleChoices.ADMIN, RoleChoices.OWNER]

        if not (is_author or is_admin_or_owner):
            raise PermissionDenied("You do not have permission to delete this comment.")

        services.delete_comment(comment=comment, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectIssueTimelineByNumberView(APIView):
    """
    Unified activity timeline for issue lookup by project key and sequential number.
    Route: /api/v1/projects/:key/issues/:number/activity/
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List timeline entries by project key and issue number",
        responses={200: TimelineItemSerializer(many=True)},
    )
    def get(self, request: Request, project_identifier: str, number: int) -> Response:
        project_filter = {"memberships__user": request.user}
        try:
            uuid_obj = UUID(project_identifier)
            project_filter["id"] = uuid_obj
        except ValueError:
            project_filter["key__iexact"] = project_identifier

        project = Project.objects.filter(**project_filter).first()
        if not project:
            raise NotFound("Project not found.")

        issue = Issue.objects.filter(project=project, number=number).first()
        if not issue:
            raise NotFound("Issue not found.")

        timeline = selectors.get_issue_timeline(issue_id=issue.id, user=request.user)
        return Response(TimelineItemSerializer(timeline, many=True).data)


class ProjectIssueCommentsByNumberView(APIView):
    """
    Comments listing and creation by project key and sequential number.
    Route: /api/v1/projects/:key/issues/:number/comments/
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List comments by project key and issue number",
        responses={200: CommentSerializer(many=True)},
    )
    def get(self, request: Request, project_identifier: str, number: int) -> Response:
        project_filter = {"memberships__user": request.user}
        try:
            uuid_obj = UUID(project_identifier)
            project_filter["id"] = uuid_obj
        except ValueError:
            project_filter["key__iexact"] = project_identifier

        project = Project.objects.filter(**project_filter).first()
        if not project:
            raise NotFound("Project not found.")

        issue = Issue.objects.filter(project=project, number=number).first()
        if not issue:
            raise NotFound("Issue not found.")

        comments = selectors.get_issue_comments(issue_id=issue.id, user=request.user)
        return Response(CommentSerializer(comments, many=True).data)

    @extend_schema(
        summary="Create comment by project key and issue number",
        request=CommentCreateSerializer,
        responses={201: CommentSerializer},
    )
    def post(self, request: Request, project_identifier: str, number: int) -> Response:
        project_filter = {"memberships__user": request.user}
        try:
            uuid_obj = UUID(project_identifier)
            project_filter["id"] = uuid_obj
        except ValueError:
            project_filter["key__iexact"] = project_identifier

        project = Project.objects.filter(**project_filter).first()
        if not project:
            raise NotFound("Project not found.")

        issue = Issue.objects.filter(project=project, number=number).first()
        if not issue:
            raise NotFound("Issue not found.")

        user_role = get_user_role_in_project(project_id=project.id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot create comments.")

        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            comment = services.create_comment(
                issue=issue,
                author=request.user,
                body=serializer.validated_data["body"],
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)
