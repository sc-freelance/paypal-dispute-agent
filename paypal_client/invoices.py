"""PayPal Invoicing API v2 (sandbox).

Checked against PayPal's official Invoicing v2 reference (25 Oct 2026):
- Create draft:  POST /v2/invoicing/invoices              (header `Prefer: return=representation`
                 makes PayPal return the full invoice, including `id` and `status`)
- Send:          POST /v2/invoicing/invoices/{id}/send    (200 = sent now, 202 = scheduled)
- List:          GET  /v2/invoicing/invoices              (page 1–1000, page_size 1–100, default 20)
- Show details:  GET  /v2/invoicing/invoices/{id}

Each function is small, typed and documented, because the AI agent may call them as tools.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from paypal_client.auth import paypal_request


def create_draft_invoice(
    *,
    recipient_email: str,
    item_name: str,
    amount: Decimal,
    currency: str = "GBP",
    recipient_name: str = "",
    note: str = "",
) -> dict[str, Any]:
    """Create a DRAFT invoice in PayPal for one line item. Nothing is emailed yet.

    Returns PayPal's full invoice object (it includes `id` and `status`, which is "DRAFT").
    """
    recipient: dict[str, Any] = {"billing_info": {"email_address": recipient_email}}
    if recipient_name:
        # PayPal splits names into given/surname; the first word is enough for a sandbox demo.
        first, _, last = recipient_name.partition(" ")
        recipient["billing_info"]["name"] = {"given_name": first, **({"surname": last} if last else {})}

    body: dict[str, Any] = {
        "detail": {"currency_code": currency, **({"note": note} if note else {})},
        "primary_recipients": [recipient],
        "items": [
            {
                "name": item_name[:200],
                "quantity": "1",
                "unit_amount": {"currency_code": currency, "value": f"{amount:.2f}"},
            }
        ],
    }
    return paypal_request("POST", "/v2/invoicing/invoices", json=body, headers={"Prefer": "return=representation"})


def send_invoice(invoice_id: str) -> dict[str, Any]:
    """Email a draft invoice to the client. This is a PayPal *write*: only call it after the user approves."""
    return paypal_request(
        "POST",
        f"/v2/invoicing/invoices/{invoice_id}/send",
        json={"send_to_recipient": True, "send_to_invoicer": False},
    )


def get_invoice(invoice_id: str) -> dict[str, Any]:
    """Return one invoice's full details from PayPal, including its current `status`."""
    return paypal_request("GET", f"/v2/invoicing/invoices/{invoice_id}")


def list_invoices(page: int = 1, page_size: int = 20) -> dict[str, Any]:
    """Return one page of invoices: `{"items": [...], "total_items": n, "total_pages": n}`."""
    return paypal_request(
        "GET",
        "/v2/invoicing/invoices",
        params={"page": page, "page_size": min(max(page_size, 1), 100), "total_required": "true"},
    )


def summarise(invoice: dict[str, Any]) -> dict[str, Any]:
    """Shrink a PayPal invoice to the few fields the app and the AI need (keeps AI token use lean)."""
    detail = invoice.get("detail", {})
    amount = invoice.get("amount", {})
    recipients = invoice.get("primary_recipients") or [{}]
    return {
        "id": invoice.get("id"),
        "status": invoice.get("status"),
        "invoice_number": detail.get("invoice_number"),
        "amount": amount.get("value"),
        "currency": amount.get("currency_code"),
        "recipient_email": recipients[0].get("billing_info", {}).get("email_address"),
    }
