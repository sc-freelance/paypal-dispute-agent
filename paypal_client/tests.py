"""Tests for the PayPal client, with HTTP faked so nothing leaves the computer."""

import os
from unittest import mock

import requests
from django.test import SimpleTestCase

from paypal_client import auth
from paypal_client.auth import PayPalError, get_access_token, paypal_request

FAKE_ENV = {"PAYPAL_CLIENT_ID": "id", "PAYPAL_CLIENT_SECRET": "secret", "PAYPAL_BASE_URL": "https://api-m.sandbox.paypal.com"}


def fake_response(status, body):
    r = mock.Mock(status_code=status, text=str(body))
    r.json.return_value = body
    return r


@mock.patch.dict(os.environ, FAKE_ENV)
class PayPalClientTests(SimpleTestCase):
    def setUp(self):
        auth._token = None  # start each test with no cached token

    @mock.patch("paypal_client.auth.requests.request")
    def test_token_is_cached(self, req):
        req.return_value = fake_response(200, {"access_token": "abc", "expires_in": 3600})
        self.assertEqual(get_access_token(), "abc")
        self.assertEqual(get_access_token(), "abc")
        self.assertEqual(req.call_count, 1)  # second call used the cache

    @mock.patch("paypal_client.auth.requests.request")
    def test_paypal_error_details_are_kept(self, req):
        req.side_effect = [
            fake_response(200, {"access_token": "abc", "expires_in": 3600}),
            fake_response(422, {"name": "UNPROCESSABLE_ENTITY", "message": "Bad invoice", "debug_id": "dbg123"}),
        ]
        with self.assertRaises(PayPalError) as ctx:
            paypal_request("POST", "/v2/invoicing/invoices", json={})
        self.assertEqual((ctx.exception.status, ctx.exception.name, ctx.exception.debug_id), (422, "UNPROCESSABLE_ENTITY", "dbg123"))

    @mock.patch("paypal_client.auth.requests.request", side_effect=requests.ConnectionError("down"))
    def test_network_failure_becomes_paypal_error(self, req):
        with self.assertRaises(PayPalError) as ctx:
            get_access_token()
        self.assertEqual(ctx.exception.name, "NETWORK_ERROR")

    def test_refuses_live_paypal(self):
        with mock.patch.dict(os.environ, {"PAYPAL_BASE_URL": "https://api-m.paypal.com"}):
            with self.assertRaises(PayPalError) as ctx:
                get_access_token()
        self.assertEqual(ctx.exception.name, "NOT_SANDBOX")
