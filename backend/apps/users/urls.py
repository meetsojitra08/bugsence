"""URL patterns for users and authentication."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import (
    ChangePasswordView,
    DemoWorkspaceView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    RegisterView,
    ResetPasswordView,
    UserAvatarUploadView,
    UserMeView,
)

urlpatterns = [
    # Auth endpoints
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/demo/", DemoWorkspaceView.as_view(), name="auth-demo"),
    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("auth/reset-password/", ResetPasswordView.as_view(), name="auth-reset-password"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    # Users endpoints
    path("users/me/", UserMeView.as_view(), name="user-me"),
    path("users/me/avatar/", UserAvatarUploadView.as_view(), name="user-avatar-upload"),
    path(
        "users/me/change-password/",
        ChangePasswordView.as_view(),
        name="user-change-password",
    ),
]
