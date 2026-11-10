# Enable pg_trgm safely when running on PostgreSQL so TrigramSimilarity works natively.

import logging

from django.db import migrations, transaction

logger = logging.getLogger(__name__)


def enable_pg_trgm(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        try:
            with transaction.atomic():
                schema_editor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        except Exception as exc:
            logger.warning("Could not create pg_trgm extension (using fallback): %s", exc)


class Migration(migrations.Migration):
    dependencies = [
        ("issues", "0003_issue_checklist_issue_external_ref_and_more"),
    ]

    operations = [
        migrations.RunPython(enable_pg_trgm, migrations.RunPython.noop),
    ]
