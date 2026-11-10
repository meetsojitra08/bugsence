import re
import secrets
from datetime import timedelta
from uuid import UUID

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.issues.notifications_dispatch import send_email_safely
from apps.projects.models import (
    InviteStatus,
    Membership,
    Project,
    ProjectInvite,
    RoleChoices,
)

User = get_user_model()


def generate_unique_project_key(name: str) -> str:
    """Generates a clean 2-10 char uppercase key from project name."""
    words = re.findall(r"[A-Za-z0-9]+", name.upper())
    if len(words) >= 2:
        base = "".join(w[0] for w in words[:4])
    elif words:
        base = words[0][:4]
    else:
        base = "PRJ"
    if len(base) < 2:
        base = (base + "PRJ")[:3]
    base = base[:6]
    candidate = base
    suffix = 1
    while Project.objects.filter(key=candidate).exists():
        suffix_str = str(suffix)
        candidate = f"{base[: 10 - len(suffix_str)]}{suffix_str}"
        suffix += 1
    return candidate


def create_project(
    *,
    user: User,
    name: str,
    key: str = "",
    description: str = "",
    is_demo: bool = False,
) -> Project:
    """
    Creates a new project and automatically establishes an Owner membership
    for the creating user in a single atomic transaction.
    """
    cleaned_key = key.strip().upper() if key else generate_unique_project_key(name)
    if Project.objects.filter(key=cleaned_key).exists():
        raise ValidationError({"key": "A project with this key already exists."})

    with transaction.atomic():
        project = Project.objects.create(
            name=name.strip(),
            key=cleaned_key,
            description=description.strip(),
            owner=user,
            current_triager=user,
            triage_rotation_updated_at=timezone.now(),
            is_demo=is_demo,
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
    default_assignee_id: UUID | None = None,
    has_default_assignee: bool = False,
    triage_rotation_enabled: bool | None = None,
    triage_rotation_cadence: str | None = None,
    current_triager_id: UUID | None = None,
    has_current_triager: bool = False,
    ai_auto_triage: bool | None = None,
    ai_confidence_threshold: float | None = None,
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

    if has_default_assignee:
        if default_assignee_id is None:
            project.default_assignee = None
        else:
            mem = (
                Membership.objects.filter(project=project, user_id=default_assignee_id)
                .select_related("user")
                .first()
            )
            if not mem:
                raise ValidationError(
                    {"default_assignee_id": "Default assignee must be a project member."}
                )
            project.default_assignee = mem.user
        update_fields.append("default_assignee")

    if triage_rotation_enabled is not None:
        project.triage_rotation_enabled = triage_rotation_enabled
        update_fields.append("triage_rotation_enabled")

    if triage_rotation_cadence is not None:
        project.triage_rotation_cadence = triage_rotation_cadence
        update_fields.append("triage_rotation_cadence")

    if has_current_triager:
        if current_triager_id is None:
            project.current_triager = None
        else:
            mem = (
                Membership.objects.filter(project=project, user_id=current_triager_id)
                .select_related("user")
                .first()
            )
            if not mem:
                raise ValidationError({"current_triager_id": "Triager must be a project member."})
            project.current_triager = mem.user
        project.triage_rotation_updated_at = timezone.now()
        update_fields.extend(["current_triager", "triage_rotation_updated_at"])

    if ai_auto_triage is not None:
        project.ai_auto_triage = ai_auto_triage
        update_fields.append("ai_auto_triage")

    if ai_confidence_threshold is not None:
        project.ai_confidence_threshold = ai_confidence_threshold
        update_fields.append("ai_confidence_threshold")

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


def create_project_invite(
    *,
    project: Project,
    invited_by: User,
    email: str = "",
    role: str = RoleChoices.MEMBER,
    invite_url_base: str = "",
) -> ProjectInvite:
    """Creates a pending email invite or shareable invite link for a project."""
    cleaned_email = email.strip().lower()
    if cleaned_email:
        if Membership.objects.filter(project=project, user__email__iexact=cleaned_email).exists():
            raise ValidationError({"email": "This user is already a project member."})
        # Revoke duplicate pending invites for the same email
        ProjectInvite.objects.filter(
            project=project,
            email__iexact=cleaned_email,
            status=InviteStatus.PENDING,
        ).update(status=InviteStatus.REVOKED)

    token = secrets.token_urlsafe(24)
    invite = ProjectInvite.objects.create(
        project=project,
        email=cleaned_email,
        role=role,
        token=token,
        invited_by=invited_by,
        status=InviteStatus.PENDING,
        expires_at=timezone.now() + timedelta(days=7),
    )

    if cleaned_email:
        join_link = (
            f"{invite_url_base.rstrip('/')}/invite/{token}"
            if invite_url_base
            else f"/invite/{token}"
        )
        send_email_safely(
            to_email=cleaned_email,
            subject=f"You're invited to {project.name} on BugSense",
            body=(
                f"{invited_by.display_name} invited you to join {project.name} ({project.key}) "
                f"as {role}.\n\nAccept your invite: {join_link}\n"
            ),
        )

    return invite


def resend_project_invite(*, invite: ProjectInvite, invite_url_base: str = "") -> ProjectInvite:
    if invite.status != InviteStatus.PENDING:
        raise ValidationError({"detail": "Only pending invites can be resent."})
    invite.expires_at = timezone.now() + timedelta(days=7)
    invite.save(update_fields=["expires_at"])
    if invite.email:
        join_link = (
            f"{invite_url_base.rstrip('/')}/invite/{invite.token}"
            if invite_url_base
            else f"/invite/{invite.token}"
        )
        inviter_name = invite.invited_by.display_name if invite.invited_by else "A teammate"
        send_email_safely(
            to_email=invite.email,
            subject=f"Reminder: You're invited to {invite.project.name} on BugSense",
            body=(
                f"{inviter_name} invited you to join {invite.project.name} ({invite.project.key}) "
                f"as {invite.role}.\n\nAccept your invite: {join_link}\n"
            ),
        )
    return invite


def revoke_project_invite(*, invite: ProjectInvite) -> None:
    invite.status = InviteStatus.REVOKED
    invite.save(update_fields=["status"])


def accept_project_invite(*, token: str, user: User) -> Membership:
    invite = ProjectInvite.objects.select_related("project").filter(token=token).first()
    if not invite:
        raise ValidationError({"detail": "Invite link not found."})
    if invite.status != InviteStatus.PENDING:
        raise ValidationError({"detail": "This invite is no longer valid."})
    if invite.expires_at and invite.expires_at < timezone.now():
        raise ValidationError({"detail": "This invite link has expired."})

    with transaction.atomic():
        membership, _ = Membership.objects.get_or_create(
            project=invite.project,
            user=user,
            defaults={"role": invite.role},
        )
        # Only mark email-targeted invites as accepted immediately;
        # shareable links (email == "") remain reusable unless revoked or single-use?
        # Keep shareable links reusable until revoked, and mark email invites accepted!
        if invite.email:
            invite.status = InviteStatus.ACCEPTED
            invite.accepted_by = user
            invite.accepted_at = timezone.now()
            invite.save(update_fields=["status", "accepted_by", "accepted_at"])
    return membership
