import uuid

from django.conf import settings
from django.db import models


class AIRequestLogKind(models.TextChoices):
    TRIAGE = "triage", "Triage"
    DUPLICATES = "duplicates", "Duplicates"
    EMBEDDING = "embedding", "Embedding"
    SUMMARIZE = "summarize", "Summarize"


class AIRequestLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_request_logs",
    )
    kind = models.CharField(
        max_length=20,
        choices=AIRequestLogKind.choices,
        db_index=True,
    )
    model = models.CharField(max_length=100)
    tokens_in = models.PositiveIntegerField(default=0)
    tokens_out = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "ai_request_logs"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        status_label = "OK" if self.success else "FAILED"
        return f"[{self.kind}] {self.model} - {status_label} ({self.latency_ms}ms)"
