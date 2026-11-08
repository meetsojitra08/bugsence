from django.urls import path

from apps.ai.views import AIDuplicatesView, AISummarizeView, AITriageView

app_name = "ai"

urlpatterns = [
    path("triage/", AITriageView.as_view(), name="ai_triage"),
    path("duplicates/", AIDuplicatesView.as_view(), name="ai_duplicates"),
    path("summarize/<uuid:issue_id>/", AISummarizeView.as_view(), name="ai_summarize"),
]
