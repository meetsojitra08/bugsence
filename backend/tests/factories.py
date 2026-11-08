"""Test factories for BugSense models."""

import uuid

import factory

from apps.issues.models import Issue, IssuePriority, IssueSeverity, IssueStatus, IssueType, Label
from apps.projects.models import Membership, Project, RoleChoices
from apps.users.models import User


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for generating test User instances."""

    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    full_name = factory.Faker("name")
    avatar_url = factory.Faker("image_url")
    is_active = True
    is_staff = False

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Ensure password is appropriately hashed via create_user."""
        password = kwargs.pop("password", "StrongP@ssw0rd!2026")
        manager = cls._get_manager(model_class)
        return manager.create_user(*args, password=password, **kwargs)


class ProjectFactory(factory.django.DjangoModelFactory):
    """Factory for generating test Project instances with creator membership."""

    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f"Project {n}")
    key = factory.Sequence(lambda n: f"P{n:04d}")
    description = factory.Faker("sentence")
    owner = factory.SubFactory(UserFactory)
    archived = False

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        from apps.projects.services import create_project

        owner = kwargs.pop("owner", None)
        if not owner:
            owner = UserFactory()
        name = kwargs.pop("name", f"Project {uuid.uuid4().hex[:4]}")
        key = kwargs.pop("key", f"P{uuid.uuid4().hex[:5].upper()}")
        description = kwargs.pop("description", "")
        return create_project(user=owner, name=name, key=key, description=description)


class MembershipFactory(factory.django.DjangoModelFactory):
    """Factory for generating test Membership instances."""

    class Meta:
        model = Membership

    project = factory.SubFactory(ProjectFactory)
    user = factory.SubFactory(UserFactory)
    role = RoleChoices.MEMBER


class LabelFactory(factory.django.DjangoModelFactory):
    """Factory for generating test Label instances."""

    class Meta:
        model = Label

    project = factory.SubFactory(ProjectFactory)
    name = factory.Sequence(lambda n: f"label-{n}")
    color = "#6366F1"
    description = factory.Faker("sentence")


class IssueFactory(factory.django.DjangoModelFactory):
    """Factory for generating test Issue instances via create_issue service."""

    class Meta:
        model = Issue

    project = factory.SubFactory(ProjectFactory)
    title = factory.Sequence(lambda n: f"Issue Title {n}")
    description = factory.Faker("paragraph")
    status = IssueStatus.TODO
    priority = IssuePriority.MEDIUM
    severity = IssueSeverity.MINOR
    type = IssueType.BUG
    reporter = factory.SubFactory(UserFactory)
    assignee = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        from apps.issues.services import create_issue

        project = kwargs.pop("project", None)
        reporter = kwargs.pop("reporter", None)
        if not project:
            project = ProjectFactory()
        if not reporter:
            reporter = project.owner
        title = kwargs.pop("title", f"Issue {uuid.uuid4().hex[:6]}")
        labels = kwargs.pop("labels", None)
        return create_issue(
            project=project,
            reporter=reporter,
            title=title,
            labels=labels,
            **kwargs,
        )
