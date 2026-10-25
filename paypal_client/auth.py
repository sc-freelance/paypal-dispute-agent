"""Signing in to PayPal, and one helper for every PayPal API call.

PayPal uses OAuth 2.0 "client credentials": we swap our Client ID + Secret for an
access token, then send that token with each request. Tokens last several hours,
so we keep one in memory and only ask for a new one when it's about to expire.
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass
from typing import Any

import requests

TIMEOUT_SECONDS = 20  # never let a slow PayPal response hang the app forever


class PayPalError(Exception):
    """A PayPal call failed. Carries PayPal's own error details for logs and the UI."""

    def __init__(self, status: int, name: str, message: str, debug_id: str | None = None):
        self.status = status
        self.name = name
        self.message = message
        self.debug_id = debug_id  # quote this to PayPal support if something looks wrong
        super().__init__(f"PayPal {status} {name}: {message}" + (f" (debug_id {debug_id})" if debug_id else ""))


@dataclass
class _Token:
    value: str
    expires_at: float  # time.time() when it stops working


_token: _Token | None = None
_token_lock = threading.Lock()  # stops two requests fetching a token at the same moment


def _settings() -> tuple[str, str, str]:
    """Read the PayPal settings from the environment, failing loudly if any are missing."""
    client_id = os.environ.get("PAYPAL_CLIENT_ID", "")
    secret = os.environ.get("PAYPAL_CLIENT_SECRET", "")
    base_url = os.environ.get("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com").rstrip("/")
    if not client_id or not secret:
        raise PayPalError(0, "NOT_CONFIGURED", "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env")
    if "sandbox" not in base_url and not base_url.startswith("http://127.0.0.1"):
        # Safety net: this project must never touch real money.
        raise PayPalError(0, "NOT_SANDBOX", f"PAYPAL_BASE_URL must be the sandbox, got {base_url}")
    return client_id, secret, base_url


def get_access_token(force_refresh: bool = False) -> str:
    """Return a valid access token, fetching a new one only when needed."""
    global _token
    with _token_lock:
        if not force_refresh and _token and _token.expires_at > time.time() + 60:
            return _token.value
        client_id, secret, base_url = _settings()
        resp = _send(
            "POST",
            f"{base_url}/v1/oauth2/token",
            auth=(client_id, secret),  # HTTP Basic auth: id as username, secret as password
            data={"grant_type": "client_credentials"},
        )
        if resp.status_code != 200:
            body = _safe_json(resp)
            raise PayPalError(resp.status_code, body.get("error", "AUTH_FAILED"), body.get("error_description", resp.text[:200]))
        body = resp.json()
        _token = _Token(value=body["access_token"], expires_at=time.time() + int(body.get("expires_in", 0)))
        return _token.value


def paypal_request(method: str, path: str, *, json: Any = None, params: dict | None = None, headers: dict | None = None) -> Any:
    """Call a PayPal REST endpoint and return the parsed JSON (or {} for an empty body).

    Raises PayPalError for any non-2xx response, with PayPal's error name, message and debug_id.
    If PayPal says the token is invalid (401), fetches a fresh one and tries once more.
    """
    _, _, base_url = _settings()
    for attempt in range(2):
        all_headers = {"Authorization": f"Bearer {get_access_token(force_refresh=attempt > 0)}", "Content-Type": "application/json"}
        all_headers.update(headers or {})
        resp = _send(method, f"{base_url}{path}", json=json, params=params, headers=all_headers)
        if resp.status_code == 401 and attempt == 0:
            continue  # token expired early or was revoked: refresh and retry once
        break

    if 200 <= resp.status_code < 300:
        return _safe_json(resp)
    body = _safe_json(resp)
    raise PayPalError(resp.status_code, body.get("name", "HTTP_ERROR"), body.get("message", resp.text[:200]), body.get("debug_id"))


def _send(method: str, url: str, **kwargs: Any) -> requests.Response:
    """Make the HTTP request, turning network failures (no internet, blocked, timeout) into a PayPalError."""
    try:
        return requests.request(method, url, timeout=TIMEOUT_SECONDS, **kwargs)
    except requests.RequestException as e:
        raise PayPalError(0, "NETWORK_ERROR", f"Couldn't reach PayPal: {type(e).__name__}") from e


def _safe_json(resp: requests.Response) -> dict:
    """Parse a JSON body, returning {} if the body is empty or not JSON."""
    try:
        data = resp.json()
        return data if isinstance(data, dict) else {"data": data}
    except ValueError:
        return {}
