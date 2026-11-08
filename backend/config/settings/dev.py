"""Development settings for BugSense project."""

from .base import *  # noqa: F403

DEBUG = True

# Relaxed hosts for local development
ALLOWED_HOSTS = ["*"]

# In-memory or console email backend for dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
