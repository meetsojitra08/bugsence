from uuid import UUID

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

from apps.projects.models import Membership, Project, RoleChoices

User = get_user_model()


def create_project(
    *,
    user: User,
    name: str,
    key: str,
    description: str = "",
) -> Project:
    """
    Creates a new project and automatically establishes an Owner membership
    for the creating user in a single atomic transaction.
    """
    cleaned_key = key.strip().upper()
    if Project.objects.filter(key=cleaned_key).exists():
        raise ValidationError({"key": "A project with this key already exists."})

    with transaction.atomic():
        project = Project.objects.create(
            name=name.strip(),
            key=cleaned_key,
            description=description.strip(),
            owner=user,
        )
        Membership.objects.create(
            project=project,
            user=user,
            role=RoleChoices.OWNER,
        )

    return project


def update_project(
    *,
    project: Project,
    name: str | None = None,
    description: str | None = None,
    archived: bool | None = None,
) -> Project:
    """
    Updates mutable project attributes. Project key is intentionally immutable.
    """
    update_fields = ["updated_at"]

    if name is not None:
        project.name = name.strip()
        update_fields.append("name")

    if description is not None:
        project.description = description.strip()
        update_fields.append("description")

    if archived is not None:
        project.archived = archived
        update_fields.append("archived")

    project.save(update_fields=update_fields)
    return project


def delete_project(*, project: Project) -> None:
    """
    Deletes the project. Associated memberships are cascade-deleted.
    """
    project.delete()


def add_member(
    *,
    project: Project,
    email: str,
    role: str,
) -> Membership:
    """
    Adds an existing registered user to the project with the specified role.
    """
    target_user = User.objects.filter(email__iexact=email.strip()).first()
    if not target_user:
        raise ValidationError({"email": "User with this email does not exist."})

    if Membership.objects.filter(project=project, user=target_user).exists():
        raise ValidationError({"email": "User is already a member of this project."})

    if role not in RoleChoices.values:
        raise ValidationError(
            {"role": f"Invalid role '{role}'. Allowed roles: {RoleChoices.values}"}
        )

    membership = Membership.objects.create(
        project=project,
        user=target_user,
        role=role,
    )
    return membership


def update_member_role(
    *,
    project: Project,
    membership_id: UUID,
    new_role: str,
) -> Membership:
    """
    Updates a member's role. Protects against demoting the sole owner.
    """
    if new_role not in RoleChoices.values:
        raise ValidationError(
            {"role": f"Invalid role '{new_role}'. Allowed roles: {RoleChoices.values}"}
        )

    try:
        membership = Membership.objects.select_related("user").get(
            id=membership_id,
            project=project,
        )
    except Membership.DoesNotExist as err:
        raise ValidationError({"detail": "Membership not found in this project."}) from err

    # If current role is OWNER and changing to something else, protect sole owner
    if membership.role == RoleChoices.OWNER and new_role != RoleChoices.OWNER:
        owner_count = Membership.objects.filter(
            project=project,
            role=RoleChoices.OWNER,
        ).count()
        if owner_count <= 1:
            raise ValidationError({"detail": "Cannot change the role of the only project owner."})

    membership.role = new_role
    membership.save(update_fields=["role", "updated_at"])
    return membership


def remove_member(
    *,
    project: Project,
    membership_id: UUID,
) -> None:
    """
    Removes a member from the project. Protects against removing the sole owner.
    """
    try:
        membership = Membership.objects.get(
            id=membership_id,
            project=project,
        )
    except Membership.DoesNotExist as err:
        raise ValidationError({"detail": "Membership not found in this project."}) from err

    # Protect sole owner
    if membership.role == RoleChoices.OWNER:
        owner_count = Membership.objects.filter(
            project=project,
            role=RoleChoices.OWNER,
        ).count()
        if owner_count <= 1:
            raise ValidationError({"detail": "Cannot remove the only project owner."})

    membership.delete()
