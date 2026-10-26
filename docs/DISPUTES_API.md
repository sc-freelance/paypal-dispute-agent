# PayPal Disputes API: research notes (26 Oct 2026)

What we checked in PayPal's official docs before building the dispute agent. Items marked **TO CONFIRM** get settled against a real sandbox response (`python manage.py paypal_check` prints the real field names), not guessed.

## Endpoints we'll use

| What | Method + path | Notes |
|---|---|---|
| List disputes | `GET /v1/customer/disputes` | Filter with `disputed_transaction_id` |
| Dispute details | `GET /v1/customer/disputes/{id}` | Full record, including `evidences` and `links` |
| **Provide evidence** | `POST /v1/customer/disputes/{id}/provide-evidence` | `multipart/form-data`: a JSON part named **`input`** (`{"evidences": [...]}`) plus optional file parts. Returns 200 with a link to the dispute. |
| Sandbox: move to evidence stage | `POST /v1/customer/disputes/{id}/require-evidence` | Body `{"action": "SELLER_EVIDENCE"}` → `WAITING_FOR_SELLER_RESPONSE`. Needs status `UNDER_REVIEW` and a `require-evidence` link. |
| Sandbox: settle | `POST /v1/customer/disputes/{id}/adjudicate` | Body `{"adjudication_outcome": "SELLER_FAVOR"}` or `"BUYER_FAVOR"`. Needs status `UNDER_REVIEW` and an `adjudicate` link. |
| Sandbox: change reason | `POST /v1/customer/disputes/{id}/change-reason` | `reason` and `note`. Useful for the demo. |

**Rule we follow:** before calling an action, check the dispute's `links` (HATEOAS). PayPal lists exactly which actions are allowed right now, so we never guess from the status. See `allowed_actions()` in `paypal_client/disputes.py`.

## Key fields in a dispute

- `dispute_id`, `reason`, `status`, `dispute_life_cycle_stage`, `seller_response_due_date`
- `status` can be `OPEN`, `WAITING_FOR_SELLER_RESPONSE`, `WAITING_FOR_BUYER_RESPONSE`, `UNDER_REVIEW` or `RESOLVED`
- `dispute_life_cycle_stage` can be `INQUIRY`, `CHARGEBACK`, `PRE_ARBITRATION` or `ARBITRATION`
- `evidences`: entries with source `REQUESTED_FROM_SELLER` are what PayPal wants from us
- `allowed_response_options` and `links`
- **TO CONFIRM:** inside `disputed_transactions`, the exact fields that link back to our payment and invoice (for example `seller_transaction_id` or `invoice_number`). The connection between a dispute and Transaction Search depends on these.

## Reasons
`MERCHANDISE_OR_SERVICE_NOT_RECEIVED`, `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED`, `UNAUTHORISED`, `CREDIT_NOT_PROCESSED`, `DUPLICATE_TRANSACTION`, `INCORRECT_AMOUNT`, `PAYMENT_BY_OTHER_MEANS`, `CANCELED_RECURRING_BILLING`, `OTHER`.

The first two are the freelancer's main problem: "never received" and "not as described".

## Evidence
- Each evidence item has `evidence_type`, `evidence_info` and `notes`.
- Types named in the docs: `PROOF_OF_FULFILLMENT`, `PROOF_OF_REFUND`, `OTHER`. The sandbox guidance says to use **`OTHER`**.
- Notes can be up to **2,000 characters**.
- Files: JPG, JPEG, GIF, PNG or PDF, **each under 10 MB and 50 MB per request**.

## Creating a test dispute in the sandbox
- **UI route (what we use):** the personal (buyer) account pays, then opens a case in the Resolution Center ("item not received" or "not as described").
- **API route (`POST /v1/customer/disputes`, sandbox-only):** needs a `PayPal-Auth-Assertion` header, which is meant for partner platforms, so we use the UI instead.
- **Sandbox quirk:** for "not received" and "not as described", the transaction amount decides the escalation day (5.00–5.99 → day 5, 9.00–9.99 → day 9, 11.00 and over → day 11).

## Sources
- [Disputes: test and go live](https://developer.paypal.com/disputes/test-go-live)
- [Disputes: use the Disputes API](https://docs.paypal.ai/growth/disputes/handle-disputes/use-disputes-api)
- [Disputes: integrate (evidence example, reasons, file limits)](https://developer.paypal.com/platforms/disputes/integrate-disputes)
- [Provide evidence reference](https://docs.paypal.ai/reference/api/rest/disputes-actions/provide-evidence.md)
