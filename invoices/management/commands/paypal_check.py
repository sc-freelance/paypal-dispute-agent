"""`python manage.py paypal_check` : test the PayPal connection from your own computer.

- With no options: signs in and lists your sandbox invoices (read-only, changes nothing).
- With --draft: also creates one DRAFT invoice to your sandbox client. Drafts are not emailed.

It never prints your Client ID, Secret or access token.
"""

import os
from decimal import Decimal

from django.core.management.base import BaseCommand

from paypal_client import PayPalError
from paypal_client.auth import get_access_token
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

            if options["draft"]:
                email = os.environ.get("PAYPAL_SANDBOX_CLIENT_EMAIL", "")
                self.stdout.write(f"3. Creating a test DRAFT invoice to {email or '(no client email set)'}...")
                inv = create_draft_invoice(recipient_email=email, item_name="Receipts connection test", amount=Decimal("1.00"))
                self.stdout.write(self.style.SUCCESS(f"   OK: created {inv.get('id')} with status {inv.get('status')} (not sent)."))
        except PayPalError as e:
            self.stdout.write(self.style.ERROR(f"   FAILED: {e}"))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("All PayPal checks passed."))
