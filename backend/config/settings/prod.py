"""Production settings for BugSense project."""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False

# Refuse to boot with the development placeholder: a known signing key invalidates JWT security.
if SECRET_KEY == "insecure-secret-key-change-in-prod" or len(SECRET_KEY) < 32:  # noqa: F405
    raise ImproperlyConfigured(
        "SECRET_KEY must be set to a unique value of at least 32 characters in production."
    )

# Security settings for production
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = "DENY"

# Render/Railway/Heroku terminate TLS at the proxy; trust its forwarded protocol.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
