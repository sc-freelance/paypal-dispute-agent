"""Tests for the approval flow. PayPal is replaced with fakes (`mock.patch`), so no network is used."""

from decimal import Decimal
from unittest import mock

from django.test import TestCase

from invoices.models import Invoice
from paypal_client import PayPalError


def make_invoice(**kwargs):
    defaults = dict(client_name="Ahmed R.", client_email="client@example.com", description="Logo pack", amount=Decimal("450.00"))
    return Invoice.objects.create(**{**defaults, **kwargs})


@mock.patch("invoices.views.get_invoice", return_value={"status": "SENT"})
@mock.patch("invoices.views.send_invoice", return_value={})
@mock.patch("invoices.views.create_draft_invoice", return_value={"id": "INV2-TEST", "status": "DRAFT"})
class ApproveTests(TestCase):
    def test_approve_creates_sends_and_records_status(self, create, send, get):
        inv = make_invoice()
        resp = self.client.post(f"/api/invoices/{inv.id}/approve/")
        self.assertEqual(resp.status_code, 200)
        inv.refresh_from_db()
        self.assertEqual(inv.status, Invoice.Status.SENT)
        self.assertEqual(inv.paypal_id, "INV2-TEST")
        self.assertEqual(inv.paypal_status, "SENT")
        create.assert_called_once()
        send.assert_called_once_with("INV2-TEST")

    def test_second_approve_is_refused_and_never_resends(self, create, send, get):
        inv = make_invoice()
        self.client.post(f"/api/invoices/{inv.id}/approve/")
        resp = self.client.post(f"/api/invoices/{inv.id}/approve/")
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(send.call_count, 1)

    def test_paypal_failure_releases_claim_and_shows_error(self, create, send, get):
        send.side_effect = PayPalError(422, "UNPROCESSABLE_ENTITY", "Invoice can't be sent")
        inv = make_invoice()
        resp = self.client.post(f"/api/invoices/{inv.id}/approve/")
        self.assertEqual(resp.status_code, 502)
        inv.refresh_from_db()
        self.assertEqual(inv.status, Invoice.Status.NEEDS_APPROVAL)  # can be retried
        self.assertIn("UNPROCESSABLE_ENTITY", inv.last_error)
        self.assertEqual(inv.paypal_id, "INV2-TEST")  # retry will only send, not create a second draft

    def test_reject_stops_it_being_sent(self, create, send, get):
        inv = make_invoice()
        self.assertEqual(self.client.post(f"/api/invoices/{inv.id}/reject/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/invoices/{inv.id}/approve/").status_code, 409)
        send.assert_not_called()
