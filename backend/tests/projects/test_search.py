import pytest
from django.urls import reverse
from rest_framework import status

from tests.factories import IssueFactory, MembershipFactory, ProjectFactory, UserFactory


@pytest.mark.django_db
class TestGlobalSearch:
    def test_search_issues_by_key_and_title(self, api_client):
        project = ProjectFactory(key="BUG")
        user = project.owner
        api_client.force_authenticate(user=user)

        issue1 = IssueFactory(
            project=project,
            title="Database connection timeout under load",
            reporter=user,
        )
        IssueFactory(
            project=project,
            title="Frontend button alignment",
            reporter=user,
        )

        url = reverse("global-search")

        # Search by keyword
        res_kw = api_client.get(url, {"q": "timeout"})
        assert res_kw.status_code == status.HTTP_200_OK
        assert len(res_kw.data["issues"]) == 1
        assert res_kw.data["issues"][0]["id"] == str(issue1.id)

        # Search by exact key
        res_key = api_client.get(url, {"q": issue1.key})
        assert res_key.status_code == status.HTTP_200_OK
        assert len(res_key.data["issues"]) >= 1
        assert res_key.data["issues"][0]["key"] == issue1.key

    def test_search_projects_and_people(self, api_client):
        project = ProjectFactory(name="Mobile iOS Application", key="IOS")
        user = project.owner
        teammate = UserFactory(full_name="Priya Sharma", email="priya@bugsense.dev")
        MembershipFactory(project=project, user=teammate)

        api_client.force_authenticate(user=user)
        url = reverse("global-search")

        # Search project
        res_proj = api_client.get(url, {"q": "Mobile"})
        assert res_proj.status_code == status.HTTP_200_OK
        assert len(res_proj.data["projects"]) == 1
        assert res_proj.data["projects"][0]["name"] == "Mobile iOS Application"

        # Search member
        res_person = api_client.get(url, {"q": "Sharma"})
        assert res_person.status_code == status.HTTP_200_OK
        assert len(res_person.data["people"]) == 1
        assert res_person.data["people"][0]["full_name"] == "Priya Sharma"

    def test_search_scoping_never_leaks_unauthorized_projects(self, api_client):
        project1 = ProjectFactory(name="Public Team Project", key="PUB")
        project2 = ProjectFactory(name="Secret Executive Project", key="SEC")

        user = project1.owner
        outsider = project2.owner

        # Issue in secret project
        IssueFactory(
            project=project2,
            title="Confidential audit defect",
            reporter=outsider,
        )

        api_client.force_authenticate(user=user)
        url = reverse("global-search")

        # Search for secret keyword
        res = api_client.get(url, {"q": "Confidential"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["issues"]) == 0
        assert len(res.data["projects"]) == 0
        assert len(res.data["people"]) == 0
