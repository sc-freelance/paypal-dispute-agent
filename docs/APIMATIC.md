# How APIMatic helped build Receipts

A running log for the APIMatic judges. This becomes the APIMatic section of the README.

## What we use

1. **The APIMatic Context Plugin for PayPal** in Claude Code. It holds skills (written guides) that Claude loads while coding, so PayPal code follows the SDK's documented contract instead of guesses from memory.
2. **APIMatic's generated PayPal Python SDK** (`paypal 2.29`, from `context-plugins/paypal-python-sdk`). Receipts uses its **Transaction Search** API so the dispute agent can cite PayPal's own record of the payment as evidence.

## Log

### Fri 23 Oct 2026: install and first plan
- **Installed the plugin.** The one-line installer (`npx context-plugins install paypal`) needs GitHub's API, which our cloud workspace can't reach. So we cloned APIMatic's public marketplace repo and installed the PayPal plugin from the local copy with the same installer. No account was needed.
- **Found the SDK's scope early.** The plugin's `python-getting-started` skill lists the SDK's 5 controllers: Orders, Payments, Subscriptions, Transaction Search and Vault. That showed in minutes, before any code was written, that Invoicing and Disputes are not covered, and it changed our plan. Instead of forcing it, we picked the part that genuinely strengthens the product: **Transaction Search as an evidence source.**
- **Followed the plugin's plan-first workflow.** The `python-integrate-paypal` skill requires a contract sheet before any code. We wrote `paypal-plan.md` from the SDK map, not from memory. It caught details that would otherwise have been bugs:
  - **`Optional` in this SDK means "may be UNSET", not "may be None"**, so `if x is None` checks would silently never fire.
  - **Leaving out `oauth2=` doesn't fail at construction.** Requests just go out unauthenticated, so we validate the credentials at startup.
  - **Transaction Search errors are always `RawError` (no typed error body)**, so the error boundary mustn't rely on `isinstance(e.error, Error)`.
  - **The 31-day maximum date range and the up-to-3-hour data delay**, which come from the operation's own docstring.
  - **Retries are on by default for `GET`**, so we don't write our own retry loop.
