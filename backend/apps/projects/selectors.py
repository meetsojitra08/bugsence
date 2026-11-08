from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Count, QuerySet

from apps.projects.models import Membership, Project

User = get_user_model()


def get_user_projects(*, user: User, include_archived: bool = True) -> QuerySet[Project]:
    """
    Returns all projects the user is a member of, annotated with members_count
    and prefetched with user's specific membership to easily read 'my_role'.
    """
    qs = (
        Project.objects.filter(memberships__user=user)
        .select_related("owner")
        .annotate(members_count=Count("memberships", distinct=True))
        .prefetch_related("memberships")
        .order_by("-created_at")
    )
    if not include_archived:
        qs = qs.filter(archived=False)
    return qs


def get_project_for_user(*, project_id: UUID, user: User) -> Project | None:
    """
    Returns a single project if the user is a member of it; returns None otherwise.
    """
    return (
        Project.objects.filter(id=project_id, memberships__user=user)
        .select_related("owner")
        .annotate(members_count=Count("memberships", distinct=True))
        .first()
    )


def get_project_members(*, project_id: UUID) -> QuerySet[Membership]:
    """
    Returns all memberships in a project, ordered by role priority and creation.
    """
    return (
        Membership.objects.filter(project_id=project_id)
        .select_related("user")
        .order_by(
            # Ordering: owner first, then admin, then member, then viewer
            models_role_order(),
            "-created_at",
        )
    )


def models_role_order():
    from django.db.models import Case, Value, When

    return Case(
        When(role="owner", then=Value(1)),
        When(role="admin", then=Value(2)),
        When(role="member", then=Value(3)),
        When(role="viewer", then=Value(4)),
        default=Value(5),
    )


def get_user_role_in_project(*, project_id: UUID, user: User) -> str | None:
    return (
        Membership.objects.filter(project_id=project_id, user=user)
        .values_list("role", flat=True)
        .first()
    )
