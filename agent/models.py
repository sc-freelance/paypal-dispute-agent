from django.db import models


class ToolCall(models.Model):
    """One action the AI agent took, e.g. "draft_invoice with {...} → created invoice #3".

    Every tool call is saved, so the UI can show "what the agent did" (and judges can see it isn't magic).
    `run_id` groups the calls made while answering one chat message.
    """

    run_id = models.CharField(max_length=36, db_index=True)
    tool_name = models.CharField(max_length=60)
    tool_input = models.JSONField(default=dict)
    result = models.JSONField(default=dict)
    ok = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.tool_name} ({'ok' if self.ok else 'error'})"
