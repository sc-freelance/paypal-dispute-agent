from django.db import models


class Invoice(models.Model):
    """Our own record of an invoice. It's linked to PayPal's copy by `paypal_id` once it's been sent.

    Life cycle:  NEEDS_APPROVAL → (you click Approve) → SENDING → SENT → PAID
                 NEEDS_APPROVAL → (you click Reject) → REJECTED
    The agent can only create NEEDS_APPROVAL invoices. Nothing reaches PayPal until you approve.
    """

    class Status(models.TextChoices):
        NEEDS_APPROVAL = "NEEDS_APPROVAL", "Your OK needed"
        SENDING = "SENDING", "Sending"
        SENT = "SENT", "Sent"
        PAID = "PAID", "Paid"
        REJECTED = "REJECTED", "Rejected"

    client_name = models.CharField(max_length=120)
    client_email = models.EmailField()
    description = models.CharField(max_length=200)  # becomes the PayPal line item name
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="GBP")
    note = models.CharField(max_length=500, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEEDS_APPROVAL)
    paypal_id = models.CharField(max_length=40, blank=True, db_index=True)  # e.g. "INV2-XXXX-..."
    paypal_status = models.CharField(max_length=30, blank=True)  # PayPal's own status, stored exactly as PayPal sends it
    last_error = models.CharField(max_length=300, blank=True)  # shown in the UI if sending failed

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.client_name}: {self.currency} {self.amount} ({self.status})"
