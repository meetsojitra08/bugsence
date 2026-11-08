from rest_framework.throttling import UserRateThrottle


class AIUserRateThrottle(UserRateThrottle):
    """
    Enforces per-user rate limit for AI operations (20 requests/minute).
    Configured under DEFAULT_THROTTLE_RATES['ai'] in Django settings.
    """

    scope = "ai"
