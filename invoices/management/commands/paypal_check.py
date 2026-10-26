"""`python manage.py paypal_check` : test the PayPal connection from your own computer.

- With no options: signs in, lists your sandbox invoices and disputes, and prints the field names of
  the newest dispute (read-only, changes nothing).
- With --draft: also creates one DRAFT invoice to your sandbox client. Drafts are not emailed.

It never prints your Client ID, Secret or access token.
"""

import os
from decimal import Decimal

from django.core.management.base import BaseCommand

from paypal_client import PayPalError
from paypal_client.auth import get_access_token
from paypal_client.disputes import allowed_actions, get_dispute, list_disputes
from paypal_client.invoices import create_draft_invoice, list_invoices, summarise


class Command(BaseCommand):
    help = "Check the PayPal sandbox connection (sign-in + list invoices; --draft creates a test draft)."

    def add_arguments(self, parser):
        parser.add_argument("--draft", action="store_true", help="Also create one test DRAFT invoice (not sent).")

    def handle(self, *args, **options):
        try:
            self.stdout.write("1. Signing in to PayPal sandbox...")
            get_access_token(force_refresh=True)
            self.stdout.write(self.style.SUCCESS("   OK: access token received (not shown)."))

            self.stdout.write("2. Listing invoices...")
            page = list_invoices(page_size=10)
            items = page.get("items", [])
            self.stdout.write(self.style.SUCCESS(f"   OK: {page.get('total_items', len(items))} invoice(s) in the sandbox."))
            for inv in items:
                s = summarise(inv)
                self.stdout.write(f"   - {s['id']}  {s['status']:<10} {s['amount']} {s['currency']}  to {s['recipient_email']}")

            self.stdout.write("3. Listing disputes...")
            disputes = list_disputes().get("items", [])
            self.stdout.write(self.style.SUCCESS(f"   OK: {len(disputes)} dispute(s) found."))
            for d in disputes[:5]:
                self.stdout.write(f"   - {d.get('dispute_id')}  {d.get('status')}  {d.get('reason')}")
            if disputes:
                # Show the shape of a real dispute (field names and IDs only, no personal data),
                # so we build the next steps from PayPal's real response rather than guesses.
                full = get_dispute(disputes[0]["dispute_id"])
                self.stdout.write(f"   Details of {full.get('dispute_id')}:")
                self.stdout.write(f"     stage={full.get('dispute_life_cycle_stage')}  due={full.get('seller_response_due_date')}")
                self.stdout.write(f"     amount={full.get('dispute_amount')}")
                self.stdout.write(f"     top-level fields: {sorted(full.keys())}")
                for tx in full.get("disputed_transactions", [])[:1]:
                    self.stdout.write(f"     disputed_transactions[0] fields: {sorted(tx.keys())}")
                    for key in ("seller_transaction_id", "buyer_transaction_id", "invoice_number"):
                        if key in tx:
                            self.stdout.write(f"       {key} = {tx[key]}")
                evid = [e.get("source") for e in full.get("evidences", [])]
                self.stdout.write(f"     evidences sources: {evid}")
                self.stdout.write(f"     allowed actions (links): {allowed_actions(full)}")

            if options["draft"]:
                email = os.environ.get("PAYPAL_SANDBOX_CLIENT_EMAIL", "")
                self.stdout.write(f"4. Creating a test DRAFT invoice to {email or '(no client email set)'}...")
                inv = create_draft_invoice(recipient_email=email, item_name="Receipts connection test", amount=Decimal("1.00"))
                self.stdout.write(self.style.SUCCESS(f"   OK: created {inv.get('id')} with status {inv.get('status')} (not sent)."))
        except PayPalError as e:
            self.stdout.write(self.style.ERROR(f"   FAILED: {e}"))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("All PayPal checks passed."))
