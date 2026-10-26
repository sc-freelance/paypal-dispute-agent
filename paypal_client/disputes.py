"""PayPal Customer Disputes API v1 (sandbox). Read-only functions for now.

Checked against PayPal's Disputes docs (26 Oct 2026); notes and sources in docs/DISPUTES_API.md:
- List:         GET /v1/customer/disputes   (filter: disputed_transaction_id)
- Show details: GET /v1/customer/disputes/{id}
Key fields: dispute_id, reason, status, dispute_life_cycle_stage, seller_response_due_date,
evidences (look for source REQUESTED_FROM_SELLER), allowed_response_options, links (which
actions are allowed right now).

Coming this week: provide-evidence (multipart), and the sandbox-only require-evidence and adjudicate.
"""

from __future__ import annotations

from typing import Any

from paypal_client.auth import paypal_request


def list_disputes(disputed_transaction_id: str = "") -> dict[str, Any]:
    """Return the account's disputes: `{"items": [...], "links": [...]}`.

    Optionally only the disputes for one PayPal transaction ID.
    """
    params = {"disputed_transaction_id": disputed_transaction_id} if disputed_transaction_id else None
    return paypal_request("GET", "/v1/customer/disputes", params=params)


def get_dispute(dispute_id: str) -> dict[str, Any]:
    """Return one dispute's full details: reason, status, deadline, requested evidence, allowed actions."""
    return paypal_request("GET", f"/v1/customer/disputes/{dispute_id}")


def allowed_actions(dispute: dict[str, Any]) -> list[str]:
    """Which actions PayPal allows on this dispute right now, from its HATEOAS `links`
    (e.g. ["self", "provide_evidence", "accept_claim"]). We check this instead of guessing from the status."""
    return [link.get("rel", "") for link in dispute.get("links", [])]
