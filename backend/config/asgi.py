"""ASGI config for BugSense project."""

import os

from django.core.asgi import get_asgi_application

# Production is the safe default for a served process; local tooling selects dev explicitly.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

application = get_asgi_application()
