"""Test factories for BugSense models."""

import factory

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
