import uuid

from django.conf import settings
from django.db import models


class NotificationKind(models.TextChoices):
    MENTION = "mention", "Mention"
    ASSIGNED = "assigned", "Assigned"
    STATUS_CHANGED = "status_changed", "Status Changed"
    COMMENT = "comment", "Comment"
    INBOX_ARRIVAL = "inbox_arrival", "Inbox Arrival"
    PR_STATUS = "pr_status", "PR Status"
    RESOLVED = "resolved", "Resolved"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
    )
    issue = models.ForeignKey(
        "issues.Issue",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    comment = models.ForeignKey(
        "issues.Comment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    kind = models.CharField(
        max_length=50,
        choices=NotificationKind.choices,
        default=NotificationKind.MENTION,
        db_index=True,
    )
    title = models.CharField(max_length=255, blank=True, default="")
    message = models.TextField(blank=True, default="")
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "read_at", "-created_at"],
                name="notif_recipient_read_idx",
            ),
        ]

    @property
    def is_read(self) -> bool:
        return self.read_at is not None

    def __str__(self) -> str:
        return f"Notification for {self.recipient.email}: [{self.kind}] {self.title}"
