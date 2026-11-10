from uuid import UUID

from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.issues import selectors, services
from apps.issues.models import Issue, IssueAttachment, IssueStatus, Label
from apps.issues.serializers import (
    ChecklistConvertSerializer,
    CommentCreateSerializer,
    CommentSerializer,
    CommentUpdateSerializer,
    IssueAttachmentSerializer,
    IssueBulkActionSerializer,
    IssueCreateSerializer,
    IssueDetailSerializer,
    IssueInboxTriageSerializer,
    IssueListSerializer,
    IssueMoveSerializer,
    IssueResolveSerializer,
    IssueUpdateSerializer,
    LabelCreateSerializer,
    LabelSerializer,
    ProjectBoardSerializer,
    PullRequestCreateSerializer,
    PullRequestLinkSerializer,
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
            exclude_inbox=request.query_params.get("exclude_inbox") == "true",
            recently_closed=request.query_params.get("recently_closed") == "true",
            blocking=request.query_params.get("blocking") == "true",
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

        duplicate_of = None
        if data.get("duplicate_of_id"):
            duplicate_of = Issue.objects.filter(
                project_id=project.id, id=data["duplicate_of_id"]
            ).first()
            if not duplicate_of:
                raise ValidationError(
                    {"duplicate_of_id": "Duplicate issue not found in this project."}
                )

        parent = None
        if data.get("parent_id"):
            parent = Issue.objects.filter(project_id=project.id, id=data["parent_id"]).first()
            if not parent:
                raise ValidationError({"parent_id": "Parent issue not found in this project."})

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
                source=data.get("source"),
                assignee=assignee,
                labels=labels,
                due_date=data.get("due_date"),
                external_reporter_name=data.get("external_reporter_name", ""),
                external_reporter_email=data.get("external_reporter_email", ""),
                is_blocking_release=data.get("is_blocking_release", False),
                duplicate_of=duplicate_of,
                parent=parent,
                checklist=data.get("checklist", []),
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
            "external_reporter_name",
            "external_reporter_email",
            "is_blocking_release",
            "checklist",
            "resolution_note",
            "snoozed_until",
        ]:
            if field in data:
                update_kwargs[field] = data[field]

        if "duplicate_of_id" in data:
            if data["duplicate_of_id"] is None:
                update_kwargs["duplicate_of"] = None
            else:
                dup = Issue.objects.filter(
                    project_id=issue.project_id, id=data["duplicate_of_id"]
                ).first()
                if not dup or dup.id == issue.id:
                    raise ValidationError({"duplicate_of_id": "Invalid duplicate target."})
                update_kwargs["duplicate_of"] = dup

        if "parent_id" in data:
            if data["parent_id"] is None:
                update_kwargs["parent"] = None
            else:
                par = Issue.objects.filter(
                    project_id=issue.project_id, id=data["parent_id"]
                ).first()
                if not par or par.id == issue.id:
                    raise ValidationError({"parent_id": "Invalid parent issue."})
                update_kwargs["parent"] = par

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


class ProjectInboxView(APIView):
    """Lists untriaged Inbox reports for a project."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: UUID) -> Response:
        project = get_project_for_user(project_id=project_id, user=request.user)
        if not project:
            raise NotFound("Project not found.")

        include_snoozed = request.query_params.get("include_snoozed") == "true"
        inbox_issues = selectors.get_project_inbox_issues(
            project_id=project.id,
            user=request.user,
            include_snoozed=include_snoozed,
        )
        return Response(IssueListSerializer(inbox_issues, many=True).data)


class IssueTriageView(APIView):
    """Performs one-click triage on an Inbox issue."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: UUID) -> Response:
        issue = selectors.get_issue_for_user(issue_id=pk, user=request.user)
        if not issue:
            raise NotFound("Issue not found.")

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot triage issues.")

        serializer = IssueInboxTriageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        assignee = None
        if data.get("assignee_id"):
            membership = (
                Membership.objects.filter(project_id=issue.project_id, user_id=data["assignee_id"])
                .select_related("user")
                .first()
            )
            if not membership:
                raise ValidationError({"assignee_id": "Assignee must be a project member."})
            assignee = membership.user

        target_issue = None
        if data.get("target_issue_id"):
            target_issue = Issue.objects.filter(
                project_id=issue.project_id, id=data["target_issue_id"]
            ).first()
            if not target_issue:
                raise ValidationError({"target_issue_id": "Target issue not found in project."})

        try:
            updated = services.triage_inbox_issue(
                issue=issue,
                actor=request.user,
                action=data["action"],
                assignee=assignee,
                priority=data.get("priority"),
                target_issue=target_issue,
                snooze_hours=data.get("snooze_hours", 24),
                reason=data.get("reason", ""),
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(IssueDetailSerializer(updated).data)


class IssueResolveView(APIView):
    """Resolves an issue with a 'What fixed it?' note and notifies the reporter."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: UUID) -> Response:
        issue = selectors.get_issue_for_user(issue_id=pk, user=request.user)
        if not issue:
            raise NotFound("Issue not found.")

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot resolve issues.")

        serializer = IssueResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resolved = services.resolve_issue(
            issue=issue,
            actor=request.user,
            resolution_note=serializer.validated_data.get("resolution_note", ""),
            notify_reporter=serializer.validated_data.get("notify_reporter", True),
        )
        return Response(IssueDetailSerializer(resolved).data)


class IssueChecklistConvertView(APIView):
    """Converts a checklist item ('Next steps') into a tracked sub-issue."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: UUID) -> Response:
        issue = selectors.get_issue_for_user(issue_id=pk, user=request.user)
        if not issue:
            raise NotFound("Issue not found.")

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot create sub-issues.")

        serializer = ChecklistConvertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            updated_parent, sub_issue = services.convert_checklist_item_to_sub_issue(
                issue=issue,
                item_id=serializer.validated_data["item_id"],
                actor=request.user,
            )
        except DjangoValidationError as exc:
            raise ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            ) from exc

        return Response(
            {
                "parent": IssueDetailSerializer(updated_parent).data,
                "sub_issue": IssueDetailSerializer(sub_issue).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProjectIssuesBulkView(APIView):
    """Performs bulk assign, status, label, or archive operations."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, project_id: UUID) -> Response:
        project = get_project_for_user(project_id=project_id, user=request.user)
        if not project:
            raise NotFound("Project not found.")

        user_role = get_user_role_in_project(project_id=project.id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot modify issues.")

        serializer = IssueBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        assignee = None
        if data["action"] == "assign" and data.get("assignee_id"):
            membership = (
                Membership.objects.filter(project=project, user_id=data["assignee_id"])
                .select_related("user")
                .first()
            )
            if not membership:
                raise ValidationError({"assignee_id": "Assignee must be a project member."})
            assignee = membership.user

        label = None
        if data["action"] == "add_label":
            if not data.get("label_id"):
                raise ValidationError({"label_id": "Label is required."})
            label = Label.objects.filter(project=project, id=data["label_id"]).first()
            if not label:
                raise ValidationError({"label_id": "Label not found in project."})

        count = services.bulk_update_issues(
            project=project,
            actor=request.user,
            issue_ids=data["issue_ids"],
            action=data["action"],
            assignee=assignee,
            status_val=data.get("status"),
            label=label,
        )
        return Response({"updated_count": count})


class IssuePullRequestView(APIView):
    """Links a Pull Request to an issue manually or from tooling."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: UUID) -> Response:
        issue = selectors.get_issue_for_user(issue_id=pk, user=request.user)
        if not issue:
            raise NotFound("Issue not found.")

        user_role = get_user_role_in_project(project_id=issue.project_id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot link pull requests.")

        serializer = PullRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        pr_link = services.link_pull_request(
            issue=issue,
            pr_number=data["pr_number"],
            title=data.get("title", ""),
            url=data["url"],
            branch=data.get("branch", ""),
            repo_full_name=data.get("repo_full_name", ""),
            state=data.get("state", "open"),
            ci_status=data.get("ci_status", "unknown"),
            actor=request.user,
            auto_transition=True,
        )
        return Response(PullRequestLinkSerializer(pr_link).data, status=status.HTTP_201_CREATED)


class ProjectChangelogView(APIView):
    """Lists recently resolved issues with resolution notes as a project changelog."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: UUID) -> Response:
        project = get_project_for_user(project_id=project_id, user=request.user)
        if not project:
            raise NotFound("Project not found.")

        resolved = (
            Issue.objects.filter(
                project=project,
                status__in=[IssueStatus.DONE, IssueStatus.CLOSED],
            )
            .exclude(resolution_note="")
            .select_related("project", "reporter", "assignee")
            .prefetch_related("labels", "pull_requests")
            .order_by("-resolved_at", "-updated_at")[:50]
        )
        return Response(
            [
                {
                    "id": str(item.id),
                    "key": item.key,
                    "number": item.number,
                    "title": item.title,
                    "resolution_note": item.resolution_note,
                    "resolved_at": item.resolved_at or item.updated_at,
                    "assignee": (
                        {"full_name": item.assignee.full_name or item.assignee.display_name}
                        if item.assignee
                        else None
                    ),
                }
                for item in resolved
            ]
        )


class ProjectAttachmentUploadView(APIView):
    """Uploads an image/screenshot attachment for Capture or Comment paste."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request: Request, project_id: UUID) -> Response:
        project = get_project_for_user(project_id=project_id, user=request.user)
        if not project:
            raise NotFound("Project not found.")

        user_role = get_user_role_in_project(project_id=project.id, user=request.user)
        if user_role == RoleChoices.VIEWER:
            raise PermissionDenied("Viewers cannot upload attachments.")

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            raise ValidationError({"file": "Select an image file to upload."})
        if uploaded_file.size > 5 * 1024 * 1024:
            raise ValidationError({"file": "Attachment size must be under 5 MB."})

        issue = None
        issue_id = request.data.get("issue_id")
        if issue_id:
            issue = Issue.objects.filter(project=project, id=issue_id).first()

        attachment = IssueAttachment.objects.create(
            project=project,
            issue=issue,
            uploaded_by=request.user,
            filename=uploaded_file.name[:255],
            content_type=getattr(uploaded_file, "content_type", "image/png")[:120],
            file=uploaded_file,
        )
        return Response(
            IssueAttachmentSerializer(attachment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
