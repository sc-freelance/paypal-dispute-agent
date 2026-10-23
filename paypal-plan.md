# PayPal SDK plan: Transaction Search as an evidence source

**Decision (Fri 23 Oct 2026, Saad):** option 1. Use APIMatic's generated PayPal Python SDK for **Transaction Search**, so the dispute agent can cite PayPal's own record of the payment ("paid £450 on 10 Oct by client@…") as evidence. Our own `paypal_client` code (Invoicing and Disputes, which this SDK does not cover) follows the same patterns: OAuth, errors and retries.

## Scope

| In scope | Out of scope (and why) |
| --- | --- |
| `client.transaction_search.search_transactions`: read-only lookup of the disputed payment | Invoicing v2 and Disputes v1: **not in this SDK** (5 controllers: orders, payments, subscriptions, transaction_search, vault). They will be written by hand in `paypal_client/`. |
| | `search_balances`: not needed by the core loop |

**How it fits the core loop (Week 2):** dispute fetched (hand-written Disputes wrapper) → take the disputed transaction's ID → `search_transactions(start_date, end_date, transaction_id=…, fields="transaction_info,payer_info,cart_info")` → store the result as an evidence record the agent can cite.

## Repo survey (read-only, 23 Oct)

- Greenfield: no Python code yet. The Django skeleton lands Sat 24 Oct (`CLAUDE.md` §5).
- **Sync vs async: sync.** Django views and management commands are plain `def`, so we use `PaypalClient` (alias `Client`), never `AsyncClient`.
- Toolchain: `pip` + `.venv/` at the repo root (git-ignored). Python 3.13.
- SDK installed in `.venv/`: `paypal 2.29`, from `git+https://github.com/context-plugins/paypal-python-sdk.git@main` (it is not on PyPI). The import probe resolves to `.venv/lib/python3.13/site-packages/paypal`. Map read from a clone of the same `main` branch, version `2.29`, so they match.
- Tests and type checker: none yet. Baseline = empty tree. Plan: `pytest` + `mypy --strict` on `paypal_client/` once it exists.

## Contract sheet: `search_transactions` (no open lookups)

| Row | Fact | Source |
| --- | --- | --- |
| Client class | `PaypalClient` (sync). Keyword-only constructor. Hold **one** client per process (module-level in `paypal_client/`), never one per request. Call `close()` at shutdown, or use it as a context manager in scripts. | sdk-map.md, Getting a client |
| Auth | `oauth2=ClientCredentials(client_id=…, client_secret=…)` from `paypal.core`, read from `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`. **If `oauth2` is omitted, requests go out unauthenticated with no error at construction**, so assert both env vars are non-empty at startup. | sdk-map.md, Servers & auth |
| Host | Pass `base_url` explicitly from `PAYPAL_BASE_URL` (`https://api-m.sandbox.paypal.com`). Omitting it silently means the sandbox. The token endpoint follows `base_url`. | sdk-map.md, Servers & auth |
| Route | `GET /v1/reporting/transactions` | map/operations/transaction_search.md |
| Signature | `search_transactions(start_date: str, end_date: str, *, transaction_id: str \| None = None, transaction_type …, transaction_status …, transaction_amount …, transaction_currency …, payment_instrument_type …, store_id …, terminal_id …, fields: str \| None = "transaction_info", balance_affecting_records_only: str \| None = "Y", page_size: int \| None = 100, page: int \| None = 1, request_options=None) -> SearchResponse` | same |
| Keyword-only boundary | `start_date` and `end_date` are positional and required. Everything after `*` is keyword-only with a real default, so **don't pass defensive `None`s**. | same |
| Date format | RFC 3339 with seconds, e.g. `2026-10-01T00:00:00Z`. **The range may not exceed 31 days.** Transactions can take **up to 3 hours** to appear. | docstring, `apis/transaction_search.py` |
| `fields` | Comma-separated. We pass `"transaction_info,payer_info,cart_info"` (`cart_info` carries `paypal_invoice_id`, linking back to our invoice). | docstring |
| Return type | `SearchResponse`. Every member is `Optional[...] = UNSET`: `transaction_details: list[TransactionDetails]`, `total_items`, `total_pages`, `page`, `last_refreshed_datetime`, … | `models/search_response.py` |
| Members we read | `TransactionDetails.transaction_info: TransactionInformation` → `transaction_id`, `transaction_initiation_date`, `transaction_updated_date`, `transaction_amount: Money`, `transaction_status` (D/P/S/V), `invoice_id`. `.payer_info: PayerInformation` → `email_address`. `.cart_info: CartInformation` → `paypal_invoice_id`. **All `Optional` = `T \| UnsetType`, not `typing.Optional`:** test with `is UNSET`, never `is None`. | `models/transaction_details.py`, `transaction_information.py`, `payer_information.py`, `cart_information.py` |
| Required members on the 2xx path | `Money.currency_code: str` and `Money.value: str` are **required**. A truncated amount fails to decode (`ValidationError`). Every other member decodes silently as `UNSET`, so the code must check that `transaction_details` is non-empty and that `transaction_id` matches before citing it. | `models/money.py` |
| Error case | **Case B**: `ApiError.error` is always `RawError` (`status_code`, `text()`, `json()`). No typed arm, so don't use `isinstance(e.error, Error)`. | map page |
| Non-`ApiError` failures | A decode failure raises `pydantic.ValidationError` / `ValueError`, and transport failures arrive as `httpx2` exceptions, unwrapped. A failed **token fetch** has its own path (see `python-authentication`). The boundary catches all of them and turns them into "PayPal payment record unavailable", so the agent drafts without that evidence instead of crashing. | sdk-map.md, Error-handling model |
| Response mode | Parsed call (raises). We need the payload, not the status. | decision |
| Retries | **Keep the default.** It's a `GET`, so it is retried on 408/429/5xx up to 3 times with backoff. Nothing to add. | sdk-map.md, Retries |
| Whole-call limit | Sync code, so there is no whole-call budget. `timeout=30.0` (the default) limits each wait. Acceptable for one lookup per dispute. | sdk-map.md |
| Returns `None`? | No. | — |

## DUPLICATE CLAIMS

none. `search_transactions` is a read-only `GET` with nothing to claim.

## Assumptions & Blockers

1. **BLOCKER (account step, Saad):** Transaction Search must be switched on for the sandbox app. Go to developer.paypal.com → Apps & Credentials → **Sandbox** → open the app → app settings → tick **Transaction Search** → Save. Without it the API refuses the call (`PERMISSION_DENIED`).
2. **BLOCKER (credentials):** The read-only smoke call needs `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in a `.env` in this workspace. Until then the sandbox entitlement is **UNVERIFIED**.
3. **Assumption, to verify in Week 2 against the official Disputes docs:** a dispute's response names the disputed transaction's ID, which becomes `transaction_id` here. The Disputes API is not in this SDK, so this is checked on PayPal's own docs, not from memory.
4. **Assumption:** a sandbox transaction only exists once the sandbox client actually **pays** an invoice. The smoke call returns an empty `transaction_details` until then, which is fine for proving the permission works.

## REQUIRED READING (load all before implementing)

- MUST load `python-client-initialization`: one long-lived sync client, closing it, where it lives in Django.
- MUST load `python-authentication`: credentials from env, and the failed-token-fetch path.
- MUST load `python-calling-endpoints`: the positional/keyword-only split, parsed vs raw mode.
- MUST load `python-models`: `UNSET` vs `None`, reading nested optional members, `to_dict` for storing the evidence record.
- MUST load `python-error-handling`: the Case B `RawError` boundary and the non-`ApiError` failures.
- MUST load `python-configuration-resilience`: `base_url`, default retries and the timeout.
- MUST load `python-testing`: fake the transport (`custom_http_client`) for the unit test, with no real network.

## Where in the code

`TBD` until the Django skeleton exists: `paypal_client/transactions.py` (`find_payment(transaction_id, around)` → a small dataclass the agent can cite), plus `paypal_client/sdk.py` holding the single `PaypalClient`.
