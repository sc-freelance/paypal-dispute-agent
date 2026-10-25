from rest_framework import serializers

from invoices.models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    """Turns an Invoice into JSON for the React app (and back). Status fields are read-only:
    only the approve/reject endpoints may change them."""

    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "client_name", "client_email", "description", "amount", "currency", "note",
            "status", "status_label", "paypal_id", "paypal_status", "last_error", "created_at", "sent_at",
        ]
        read_only_fields = ["status", "paypal_id", "paypal_status", "last_error", "created_at", "sent_at"]
