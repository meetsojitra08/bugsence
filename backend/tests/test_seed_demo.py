import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.issues.models import Issue
from apps.projects.models import Project

User = get_user_model()


@pytest.mark.django_db
class TestSeedDemoCommand:
    def test_seed_demo_creates_complete_workspace(self):
        # Run command
        call_command("seed_demo")

        # 1. Verify Users
        assert User.objects.filter(email="demo@bugsense.dev").exists()
        assert User.objects.filter(email="sarah.chen@bugsense.dev").exists()
        assert User.objects.filter(email="marcus.vance@bugsense.dev").exists()
        assert User.objects.filter(email="elena.rostova@bugsense.dev").exists()

        demo_user = User.objects.get(email="demo@bugsense.dev")
        assert demo_user.check_password("DemoPassword123!")

        # 2. Verify Projects
        bug_proj = Project.objects.filter(key="BUG").first()
        assert bug_proj is not None
        assert bug_proj.owner == demo_user

        mob_proj = Project.objects.filter(key="MOB").first()
        assert mob_proj is not None

        # 3. Verify Issues
        issues_count = Issue.objects.filter(project=bug_proj).count()
        assert issues_count >= 40

        # 4. Verify Labels
        assert bug_proj.labels.count() >= 6

        # 5. Verify Comments
        first_issue = Issue.objects.filter(project=bug_proj).first()
        assert first_issue is not None

    def test_seed_demo_is_idempotent(self):
        # Run twice in succession
        call_command("seed_demo")
        initial_issues = Issue.objects.count()

        call_command("seed_demo")
        second_issues = Issue.objects.count()

        # Issue count should not duplicate
        assert second_issues == initial_issues
