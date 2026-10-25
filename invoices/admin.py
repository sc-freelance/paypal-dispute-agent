from django.contrib import admin

from invoices.models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Shows invoices in Django's admin site (/admin/), handy for checking data while building."""

    list_display = ["id", "client_name", "amount", "currency", "status", "paypal_status", "created_at"]
    list_filter = ["status"]
    search_fields = ["client_name", "client_email", "paypal_id"]
