"""Tests for Projects and Membership API endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status

from apps.projects.models import Membership, Project, RoleChoices
from tests.factories import MembershipFactory, ProjectFactory, UserFactory


@pytest.mark.django_db
class TestProjectCRUD:
    """Covers project listing, creation, retrieval, updates, and deletion."""

    def test_list_projects_unauthenticated(self, api_client):
        url = reverse("project-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_projects_isolation(self, auth_client, user):
        # Create a project owned by another user
        other_user = UserFactory()
        other_project = ProjectFactory(owner=other_user, name="Other Co", key="OTH")

        # Create a project owned by test user
        my_project = ProjectFactory(owner=user, name="My Workspace", key="MYW")

        url = reverse("project-list")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data.get("results", response.data)
        project_ids = [p["id"] for p in data]

        assert str(my_project.id) in project_ids
        assert str(other_project.id) not in project_ids

        # Verify my_role and members_count
        my_item = next(p for p in data if p["id"] == str(my_project.id))
        assert my_item["my_role"] == RoleChoices.OWNER
        assert my_item["members_count"] == 1

    def test_create_project_success(self, auth_client, user):
        url = reverse("project-list")
        payload = {
            "name": "Acme Platform",
            "key": "acme",  # lowercase will be uppercase normalized
            "description": "Core platform bug tracker",
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Acme Platform"
        assert response.data["key"] == "ACME"
        assert response.data["my_role"] == RoleChoices.OWNER

        # Verify DB records
        project = Project.objects.get(id=response.data["id"])
        assert project.owner == user
        membership = Membership.objects.get(project=project, user=user)
        assert membership.role == RoleChoices.OWNER

    def test_create_project_duplicate_key(self, auth_client):
        ProjectFactory(key="DUPKEY")

        url = reverse("project-list")
        payload = {
            "name": "Second Project",
            "key": "dupkey",
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "key" in response.data.get("error", {}).get("details", {}) or "key" in response.data

    def test_create_project_invalid_key(self, auth_client):
        url = reverse("project-list")
        payload = {
            "name": "Invalid Project",
            "key": "A",  # too short (min length 2)
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_project_success(self, auth_client, user):
        project = ProjectFactory(owner=user, name="Alpha", key="ALP")
        url = reverse("project-detail", kwargs={"pk": project.id})
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(project.id)
        assert response.data["key"] == "ALP"
        assert response.data["my_role"] == RoleChoices.OWNER

    def test_retrieve_project_non_member_returns_404(self, auth_client):
        other_user = UserFactory()
        other_project = ProjectFactory(owner=other_user, key="SECRET")

        url = reverse("project-detail", kwargs={"pk": other_project.id})
        response = auth_client.get(url)

        # Enforces isolation: non-members receive 404
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_project_admin_or_owner_success(self, auth_client, user):
        project = ProjectFactory(owner=user, name="Old Name", key="PRJ")

        url = reverse("project-detail", kwargs={"pk": project.id})
        payload = {
            "name": "New Name",
            "description": "Updated description",
            "archived": True,
        }
        response = auth_client.patch(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "New Name"
        assert response.data["archived"] is True

        project.refresh_from_db()
        assert project.name == "New Name"
        assert project.archived is True

    def test_update_project_key_is_immutable(self, auth_client, user):
        project = ProjectFactory(owner=user, key="STATIC")

        url = reverse("project-detail", kwargs={"pk": project.id})
        response = auth_client.patch(url, {"key": "MUTATED"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        assert project.key == "STATIC"

    def test_update_project_member_or_viewer_forbidden(self, auth_client, user):
        owner = UserFactory()
        project = ProjectFactory(owner=owner, key="LOCKED")
        # Add test user as regular member
        MembershipFactory(project=project, user=user, role=RoleChoices.MEMBER)

        url = reverse("project-detail", kwargs={"pk": project.id})
        response = auth_client.patch(url, {"name": "Hacked Name"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_project_owner_success(self, auth_client, user):
        project = ProjectFactory(owner=user, key="DEL")

        url = reverse("project-detail", kwargs={"pk": project.id})
        response = auth_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Project.objects.filter(id=project.id).exists()

    def test_delete_project_admin_forbidden(self, auth_client, user):
        owner = UserFactory()
        project = ProjectFactory(owner=owner, key="DEL2")
        # Add test user as admin
        MembershipFactory(project=project, user=user, role=RoleChoices.ADMIN)

        url = reverse("project-detail", kwargs={"pk": project.id})
        response = auth_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Project.objects.filter(id=project.id).exists()


@pytest.mark.django_db
class TestProjectMembers:
    """Covers member listing, invitations, role modifications, and removals."""

    def test_list_members_success(self, auth_client, user):
        project = ProjectFactory(owner=user, key="TEAM")
        colleague = UserFactory(email="colleague@example.com")
        MembershipFactory(project=project, user=colleague, role=RoleChoices.MEMBER)

        url = reverse("project-members-list", kwargs={"project_id": project.id})
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        emails = [m["user"]["email"] for m in response.data]
        assert user.email in emails
        assert colleague.email in emails

    def test_list_members_non_member_returns_404(self, auth_client):
        other_project = ProjectFactory(key="OTHER")

        url = reverse("project-members-list", kwargs={"project_id": other_project.id})
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_invite_member_admin_or_owner_success(self, auth_client, user):
        project = ProjectFactory(owner=user, key="INV")
        invitee = UserFactory(email="dev@example.com")

        url = reverse("project-members-list", kwargs={"project_id": project.id})
        payload = {
            "email": "dev@example.com",
            "role": RoleChoices.MEMBER,
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["user"]["email"] == "dev@example.com"
        assert response.data["role"] == RoleChoices.MEMBER
        assert Membership.objects.filter(project=project, user=invitee).exists()

    def test_invite_member_member_or_viewer_forbidden(self, auth_client, user):
        owner = UserFactory()
        project = ProjectFactory(owner=owner, key="INV2")
        MembershipFactory(project=project, user=user, role=RoleChoices.MEMBER)
        UserFactory(email="target@example.com")

        url = reverse("project-members-list", kwargs={"project_id": project.id})
        payload = {
            "email": "target@example.com",
            "role": RoleChoices.MEMBER,
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invite_member_nonexistent_email(self, auth_client, user):
        project = ProjectFactory(owner=user, key="INV3")

        url = reverse("project-members-list", kwargs={"project_id": project.id})
        payload = {
            "email": "ghost@example.com",
            "role": RoleChoices.MEMBER,
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invite_member_duplicate_user(self, auth_client, user):
        project = ProjectFactory(owner=user, key="INV4")
        existing_member = UserFactory(email="already@example.com")
        MembershipFactory(project=project, user=existing_member)

        url = reverse("project-members-list", kwargs={"project_id": project.id})
        payload = {
            "email": "already@example.com",
            "role": RoleChoices.MEMBER,
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_member_role_success(self, auth_client, user):
        project = ProjectFactory(owner=user, key="ROLE1")
        member_user = UserFactory()
        membership = MembershipFactory(
            project=project, user=member_user, role=RoleChoices.MEMBER
        )

        url = reverse(
            "project-members-detail",
            kwargs={"project_id": project.id, "pk": membership.id},
        )
        response = auth_client.patch(url, {"role": RoleChoices.ADMIN}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == RoleChoices.ADMIN
        membership.refresh_from_db()
        assert membership.role == RoleChoices.ADMIN

    def test_update_member_role_sole_owner_protection(self, auth_client, user):
        project = ProjectFactory(owner=user, key="SOLE")
        owner_membership = Membership.objects.get(project=project, user=user)

        url = reverse(
            "project-members-detail",
            kwargs={"project_id": project.id, "pk": owner_membership.id},
        )
        # Attempt to demote sole owner to member
        response = auth_client.patch(url, {"role": RoleChoices.MEMBER}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        owner_membership.refresh_from_db()
        assert owner_membership.role == RoleChoices.OWNER

    def test_remove_member_by_admin(self, auth_client, user):
        project = ProjectFactory(owner=user, key="REM1")
        member_user = UserFactory()
        membership = MembershipFactory(project=project, user=member_user)

        url = reverse(
            "project-members-detail",
            kwargs={"project_id": project.id, "pk": membership.id},
        )
        response = auth_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Membership.objects.filter(id=membership.id).exists()

    def test_remove_member_self_leave(self, auth_client, user):
        owner = UserFactory()
        project = ProjectFactory(owner=owner, key="LEAVE")
        my_membership = MembershipFactory(
            project=project, user=user, role=RoleChoices.MEMBER
        )

        url = reverse(
            "project-members-detail",
            kwargs={"project_id": project.id, "pk": my_membership.id},
        )
        response = auth_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Membership.objects.filter(id=my_membership.id).exists()

    def test_remove_member_sole_owner_protection(self, auth_client, user):
        project = ProjectFactory(owner=user, key="REM2")
        owner_membership = Membership.objects.get(project=project, user=user)

        url = reverse(
            "project-members-detail",
            kwargs={"project_id": project.id, "pk": owner_membership.id},
        )
        response = auth_client.delete(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Membership.objects.filter(id=owner_membership.id).exists()

    def test_direct_member_endpoint_patch_and_delete(self, auth_client, user):
        project = ProjectFactory(owner=user, key="DIRECT")
        member_user = UserFactory()
        membership = MembershipFactory(project=project, user=member_user, role=RoleChoices.MEMBER)

        # Direct PATCH /api/v1/members/{id}/
        direct_url = reverse("member-direct-detail", kwargs={"pk": membership.id})
        patch_res = auth_client.patch(direct_url, {"role": RoleChoices.VIEWER}, format="json")
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.data["role"] == RoleChoices.VIEWER

        # Direct DELETE /api/v1/members/{id}/
        del_res = auth_client.delete(direct_url)
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
        assert not Membership.objects.filter(id=membership.id).exists()
