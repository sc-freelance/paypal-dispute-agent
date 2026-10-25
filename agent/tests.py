"""Tests for the agent's tools. These run the Python tool handlers directly; Claude isn't called."""

from django.test import TestCase

from agent.tools import HANDLERS, TOOL_SCHEMAS, draft_invoice, list_invoices
from invoices.models import Invoice


class ToolTests(TestCase):
    def test_every_schema_has_a_handler(self):
        self.assertEqual({t["name"] for t in TOOL_SCHEMAS}, set(HANDLERS))

    def test_no_tool_can_send_money(self):
        # The approval rule: sending is a button for the human, never a tool for the AI.
        for name in HANDLERS:
            self.assertNotIn("send", name)
            self.assertNotIn("approve", name)

    def test_draft_invoice_only_creates_a_local_draft(self):
        result = draft_invoice(client_name="Ahmed R.", description="Logo pack", amount=450, client_email="a@example.com")
        inv = Invoice.objects.get(pk=result["invoice_id"])
        self.assertEqual(inv.status, Invoice.Status.NEEDS_APPROVAL)
        self.assertEqual(str(inv.amount), "450.00")
        self.assertEqual(inv.paypal_id, "")  # nothing has touched PayPal

    def test_draft_invoice_rejects_bad_amounts(self):
        self.assertIn("error", draft_invoice(client_name="A", description="x", amount=0, client_email="a@example.com"))
        self.assertIn("error", draft_invoice(client_name="A", description="x", amount=-5, client_email="a@example.com"))

    def test_list_invoices_filters_by_status(self):
        draft_invoice(client_name="A", description="x", amount=10, client_email="a@example.com")
        self.assertEqual(list_invoices(status="NEEDS_APPROVAL")["count"], 1)
        self.assertEqual(list_invoices(status="SENT")["count"], 0)
