"""The tools Claude may call, and the Python code that runs each one.

Each tool has two halves:
1. A JSON schema (name, description, input_schema) sent to Claude, so it knows the tool exists and
   what arguments to give.
2. A handler function that actually does the work and returns a small JSON-friendly dict.

Deliberately missing: any tool that sends an invoice or moves money. Those need your Approve click.
"""

from __future__ import annotations

import os
from decimal import Decimal, InvalidOperation
from typing import Any, Callable

from invoices.models import Invoice
from paypal_client import PayPalError
from paypal_client.invoices import list_invoices as paypal_list_invoices
from paypal_client.invoices import summarise

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "draft_invoice",
        "description": (
            "Prepare a one-line invoice as a DRAFT in the app. It is NOT sent: the user must click Approve. "
            "Use when the user asks to invoice or bill someone."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Who to bill, e.g. 'Ahmed R.'"},
                "client_email": {
                    "type": "string",
                    "description": "Client's email. Leave out to use the sandbox test client.",
                },
                "description": {"type": "string", "description": "What the work was, e.g. 'Logo design pack'"},
                "amount": {"type": "number", "description": "Total amount, e.g. 450 or 99.50"},
                "currency": {"type": "string", "description": "3-letter code, default GBP"},
            },
            "required": ["client_name", "description", "amount"],
        },
    },
    {
        "name": "list_invoices",
        "description": "List the app's invoices (newest first) with status. Optionally filter by status.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": [s.value for s in Invoice.Status], "description": "Optional filter"},
            },
        },
    },
    {
        "name": "list_paypal_invoices",
        "description": "Read invoices directly from PayPal (their status as PayPal sees it). Read-only.",
        "input_schema": {"type": "object", "properties": {}},
    },
]


def draft_invoice(client_name: str, description: str, amount: float, client_email: str = "", currency: str = "GBP") -> dict:
    try:
        value = Decimal(str(amount)).quantize(Decimal("0.01"))
    except InvalidOperation:
        return {"error": f"'{amount}' isn't a valid amount."}
    if value <= 0:
        return {"error": "The amount must be more than zero."}
    email = client_email or os.environ.get("PAYPAL_SANDBOX_CLIENT_EMAIL", "")
    if not email:
        return {"error": "No client email given and PAYPAL_SANDBOX_CLIENT_EMAIL isn't set."}
    inv = Invoice.objects.create(
        client_name=client_name[:120],
        client_email=email,
        description=description[:200],
        amount=value,
        currency=(currency or "GBP").upper()[:3],
    )
    return {"invoice_id": inv.id, "status": inv.status, "client": inv.client_name, "amount": f"{inv.currency} {inv.amount}",
            "description": inv.description, "next_step": "User must click Approve to send it via PayPal."}


def list_invoices(status: str = "") -> dict:
    qs = Invoice.objects.all()
    if status:
        qs = qs.filter(status=status)
    rows = [
        {"invoice_id": i.id, "client": i.client_name, "amount": f"{i.currency} {i.amount}", "status": i.status,
         "description": i.description}
        for i in qs[:20]  # a short summary, not a data dump: keeps token use lean
    ]
    return {"count": qs.count(), "invoices": rows}


def list_paypal_invoices() -> dict:
    try:
        page = paypal_list_invoices(page_size=10)
    except PayPalError as e:
        return {"error": f"PayPal couldn't be reached: {e.name}"}
    return {"total": page.get("total_items"), "invoices": [summarise(i) for i in page.get("items", [])]}


HANDLERS: dict[str, Callable[..., dict]] = {
    "draft_invoice": draft_invoice,
    "list_invoices": list_invoices,
    "list_paypal_invoices": list_paypal_invoices,
}
