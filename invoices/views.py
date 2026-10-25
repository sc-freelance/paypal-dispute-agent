"""Invoice API.

GET  /api/invoices/               list our invoices, newest first
POST /api/invoices/<id>/approve/  YOU approve: create the invoice in PayPal and email it to the client
POST /api/invoices/<id>/reject/   YOU reject the agent's draft

`approve` is the only code path that writes to PayPal's Invoicing API. The AI agent can't call it.
"""

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from invoices.models import Invoice
from invoices.serializers import InvoiceSerializer
from paypal_client import PayPalError
from paypal_client.invoices import create_draft_invoice, get_invoice, send_invoice


@api_view(["GET"])
def invoice_list(request):
    return Response(InvoiceSerializer(Invoice.objects.all()[:100], many=True).data)


@api_view(["POST"])
def invoice_approve(request, pk: int):
    # 1. Claim it. This UPDATE only succeeds if the invoice is still waiting for approval, so a
    #    double-click (or two browser tabs) can't send the same invoice to PayPal twice.
    claimed = Invoice.objects.filter(pk=pk, status=Invoice.Status.NEEDS_APPROVAL).update(
        status=Invoice.Status.SENDING, last_error=""
    )
    if not claimed:
        return Response({"detail": "This invoice isn't waiting for approval."}, status=status.HTTP_409_CONFLICT)

    invoice = Invoice.objects.get(pk=pk)
    try:
        # 2. Create the PayPal draft (skipped if a previous attempt already created it).
        if not invoice.paypal_id:
            draft = create_draft_invoice(
                recipient_email=invoice.client_email,
                recipient_name=invoice.client_name,
                item_name=invoice.description,
                amount=invoice.amount,
                currency=invoice.currency,
                note=invoice.note,
            )
            invoice.paypal_id = draft["id"]
            invoice.save(update_fields=["paypal_id"])
        # 3. Email it to the client, then read back PayPal's status.
        send_invoice(invoice.paypal_id)
        invoice.paypal_status = get_invoice(invoice.paypal_id).get("status", "")
        invoice.status = Invoice.Status.SENT
        invoice.sent_at = timezone.now()
    except (PayPalError, KeyError) as e:
        # Release the claim so you can try again; the error is shown in the UI.
        invoice.status = Invoice.Status.NEEDS_APPROVAL
        invoice.last_error = str(e)[:300]
    invoice.save()
    code = status.HTTP_200_OK if invoice.status == Invoice.Status.SENT else status.HTTP_502_BAD_GATEWAY
    return Response(InvoiceSerializer(invoice).data, status=code)


@api_view(["POST"])
def invoice_reject(request, pk: int):
    updated = Invoice.objects.filter(pk=pk, status=Invoice.Status.NEEDS_APPROVAL).update(status=Invoice.Status.REJECTED)
    if not updated:
        return Response({"detail": "This invoice isn't waiting for approval."}, status=status.HTTP_409_CONFLICT)
    return Response(InvoiceSerializer(Invoice.objects.get(pk=pk)).data)
