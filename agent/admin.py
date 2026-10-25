from django.contrib import admin

from agent.models import ToolCall


@admin.register(ToolCall)
class ToolCallAdmin(admin.ModelAdmin):
    """Every action the agent took, viewable at /admin/."""

    list_display = ["created_at", "tool_name", "ok", "run_id"]
    list_filter = ["tool_name", "ok"]
