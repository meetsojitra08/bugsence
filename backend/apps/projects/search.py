from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.issues.models import Issue
from apps.projects.models import Project

User = get_user_model()


class GlobalSearchView(APIView):
    """
    Unified global search endpoint powering the Command Palette (Cmd+K).
    Searches issues, projects, and people, strictly scoped to projects
    the authenticated user is a member of.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Global search across accessible projects, issues and team members",
        responses={200: OpenApiResponse(description="Grouped search results")},
    )
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response(
                {"issues": [], "projects": [], "people": []},
                status=status.HTTP_200_OK,
            )

        user_projects = Project.objects.filter(memberships__user=request.user)

        # 1. Search Issues
        issue_query = Q(title__icontains=q) | Q(description__icontains=q)

        # Key matching (e.g. "PROJ-12" or "12")
        if "-" in q:
            parts = q.split("-", 1)
            if len(parts) == 2 and parts[1].isdigit():
                issue_query |= Q(project__key__iexact=parts[0], number=int(parts[1]))
        elif q.isdigit():
            issue_query |= Q(number=int(q))

        matched_issues = (
            Issue.objects.filter(project__in=user_projects)
            .filter(issue_query)
            .select_related("project")
            .order_by("-created_at")[:10]
        )

        issues_data = [
            {
                "id": str(i.id),
                "number": i.number,
                "key": i.key,
                "title": i.title,
                "status": i.status,
                "priority": i.priority,
                "project_key": i.project.key,
            }
            for i in matched_issues
        ]

        # 2. Search Projects
        matched_projects = user_projects.filter(
            Q(name__icontains=q) | Q(key__icontains=q) | Q(description__icontains=q)
        ).distinct()[:5]

        projects_data = [
            {
                "id": str(p.id),
                "name": p.name,
                "key": p.key,
                "description": p.description,
            }
            for p in matched_projects
        ]

        # 3. Search People (distinct across user's accessible projects)
        matched_people = (
            User.objects.filter(memberships__project__in=user_projects)
            .filter(Q(full_name__icontains=q) | Q(email__icontains=q))
            .distinct()[:5]
        )

        people_data = [
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "avatar_url": u.avatar_url,
            }
            for u in matched_people
        ]

        return Response(
            {
                "issues": issues_data,
                "projects": projects_data,
                "people": people_data,
            },
            status=status.HTTP_200_OK,
        )
