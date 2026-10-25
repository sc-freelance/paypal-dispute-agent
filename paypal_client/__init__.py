"""PayPal service layer for Receipts (sandbox only).

The rest of the app talks to PayPal only through this package:

- `auth.py`      signs in to PayPal (OAuth 2.0) and caches the access token
- `invoices.py`  Invoicing API v2: create, send, list and show invoices

Endpoints and payloads are checked against PayPal's official Invoicing v2 docs
(see docs/LEARNING.md), not written from memory.
"""

from paypal_client.auth import PayPalError, paypal_request

__all__ = ["PayPalError", "paypal_request"]
