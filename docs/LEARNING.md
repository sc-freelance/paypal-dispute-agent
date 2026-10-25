# Learning log

One short entry per file or concept, in plain English, so I can explain every part of Receipts to judges and in interviews. Newest entries go at the bottom of each section.

---

## Files

### `CLAUDE.md`
**What:** The project brief: goals, prize targets, rules for working with Claude, the tech stack and the timeline. The **Decisions log** table at the top records every choice I've made (Django, JavaScript, Django serving React, the Receipts personality).
**Why:** Claude Code reads this file automatically at the start of every session, so the rules and decisions never have to be repeated.
**Connects to:** Everything. If code and `CLAUDE.md` disagree, the brief wins until I change it.

### `LICENSE`
**What:** The MIT licence. Anyone may use, copy and change the code, as long as they keep the licence notice.
**Why:** The hackathon requires a public repo with an open-source licence visible in GitHub's About section. GitHub shows it there automatically because the file is called `LICENSE`.

### `README.md`
**What:** The front page judges read on GitHub. It covers:
- the problem and the core loop
- a feature status table (Done, In progress, Planned)
- the tech stack and an architecture diagram
- the PayPal APIs used, and how Claude and APIMatic were used
- setup steps, Render deploy steps and the project structure

**First full version:** Sun 25 Oct. The diagram is written in **Mermaid**, a text format that GitHub draws as a picture. The status table gets updated as features land, and the final polish comes on Mon 9 Nov.

### `.gitignore` (added Fri 23 Oct)
**What:** A list of files and folders git should never track.
**Why:** Some files must never reach GitHub:
- **Secrets:** `.env` holds my real API keys.
- **Generated files:** `node_modules/`, `frontend/dist/`, `staticfiles/` and `__pycache__/` can all be rebuilt from the code, and they're huge.
- **Local data:** `db.sqlite3` is my own test database.

**How it works:** Each line is a pattern. `.env.*` ignores any file starting with `.env.`, and the `!` in `!.env.example` makes an exception so the example file *is* committed.
**Connects to:** `.env.example` (below).

### `.env.example` (added Fri 23 Oct)
**What:** A template listing every setting the app needs (PayPal keys, the Anthropic key and model, Django settings, demo mode), with fake placeholder values.
**Why:** A judge cloning the repo copies it to `.env` and fills in their own keys. It documents the settings without exposing mine.
**Connects to:** The Django settings file (Saturday) reads these values with `os.environ`. The PayPal wrapper uses the `PAYPAL_*` values, and the AI agent uses the `ANTHROPIC_*` values.

### `requirements.txt` (added Fri 23 Oct)
**What:** The list of Python packages the app needs. `pip install -r requirements.txt` installs them all.
**So far:** Only APIMatic's PayPal SDK. Its line looks unusual (`paypal @ git+https://…`) because that package isn't published on PyPI, so pip installs it straight from its GitHub repo. Django and the other packages get added on Saturday.

### `paypal-plan.md` (added Fri 23 Oct)
**What:** The plan and "contract sheet" for using APIMatic's SDK for Transaction Search. Every fact in it (function signature, date format, error type, which fields may be missing) was looked up in the SDK's own map and source, not remembered.
**Why:** The APIMatic plugin's workflow requires it before any SDK code is written, and it's the evidence for the APIMatic prize that we used the tool properly.
**Connects to:** `paypal_client/` (Saturday onwards) and the dispute agent (Week 2).

### `docs/APIMATIC.md` (added Fri 23 Oct)
**What:** A dated log of how APIMatic helped. It becomes the README's APIMatic section for the judges.

---

## Backend: Django (added Sat 24 Oct)

### `manage.py`
**What:** Django's command-line tool. You don't edit it, you run it:
- `python manage.py runserver` starts the dev server.
- `python manage.py migrate` creates the database tables.
- `python manage.py startapp …` creates a new app.

### `config/` (the project folder)
Django splits code into one **project** (site-wide settings) and several **apps** (features). `config/` is the project.

- **`config/settings.py`**: every setting for the site.
  - It loads `.env` with `python-dotenv`, then reads secrets with `os.environ.get(...)`, so there are no keys in the code.
  - `DEBUG` comes from `DJANGO_DEBUG`. It's on locally, giving detailed error pages, and must be off on Render. If `DJANGO_SECRET_KEY` is missing in production, the app refuses to start rather than run insecurely.
  - `INSTALLED_APPS` lists Django's built-ins, `rest_framework` (DRF) and our four apps.
  - `MIDDLEWARE` is code that runs on every request. We added **WhiteNoise**, which serves the built React files.
  - `FRONTEND_DIST` points at `frontend/dist`, where React is built. It's listed in `TEMPLATES` (so Django can find `index.html`) and in `STATICFILES_DIRS` (so it can serve the JS and CSS).
  - `DATABASES` uses SQLite, a single file called `db.sqlite3`.
  - `TIME_ZONE = "Europe/London"`, while times are stored in UTC.
- **`config/urls.py`**: the URL map, checked top to bottom.
  - `admin/` goes to Django's admin site.
  - `api/health/` goes to the health check.
  - Everything else goes to React. That last pattern (`re_path(r"^(?!api/|admin/|static/).*$")`) is a **regular expression** meaning "any URL that does *not* start with api/, admin/ or static/".
- **`config/views.py`**: two views.
  - `health` is a DRF API view returning JSON, like `{"status": "ok", "paypal_configured": true, …}`. It only reports true/false, never the keys.
  - `spa` returns React's `index.html` for any page URL.
- **`config/wsgi.py` / `config/asgi.py`**: entry points that production servers like gunicorn use to load Django. Generated by Django, and not edited.

### The apps: `invoices/`, `disputes/`, `agent/`, `insights/`
Each was created by `startapp` and has the standard files:
- `models.py` describes the database tables.
- `views.py` holds the code that handles requests.
- `admin.py` registers the app with the admin site.
- `apps.py` holds the app's config.
- `tests.py` holds its tests.
- `migrations/` stores the database change history.

They're empty for now. Each one gets filled in as we build its feature:
- **invoices:** Saturday and Sunday
- **disputes** and **agent:** Week 2
- **insights:** Week 3

### `paypal_client/`
A **plain Python package**, not a Django app: just `__init__.py` so far. It will hold the PayPal service layer: sign-in, invoices, disputes, and Transaction Search through APIMatic's SDK. It has no database tables or pages, so it doesn't need the app files, which keeps it simpler.

### `requirements.txt` (updated Sat 24 Oct)
Now pins exact versions of Django, Django REST Framework, python-dotenv, WhiteNoise, gunicorn and APIMatic's PayPal SDK, so Render installs exactly what we tested with.

### `build.sh`
One script that builds the whole app for production: install the Python packages, build React, `collectstatic`, then `migrate`. Render will run it on every deploy, and it was tested locally.

---

## Frontend: React with Vite (added Sat 24 Oct)

### `frontend/package.json` and `package-lock.json`
- **`package.json`** is the JavaScript version of `requirements.txt`. It lists React and Vite, plus the commands: `npm run dev` (dev server), `npm run build` (production build) and `npm run lint`.
- **`package-lock.json`** pins every exact version, so `npm ci` installs the same versions every time.

### `frontend/vite.config.js`
- `base: '/static/'` applies to the production build only. Django serves React's files under `/static/`, so every link in the built `index.html` must start with that.
- `proxy` applies to `npm run dev` only. Vite runs on port 5173 and Django on 8000, and the proxy forwards `/api/...` calls from Vite to Django.

### `frontend/index.html`
The one HTML page. It loads the Space Grotesk and Space Mono fonts from Google Fonts, and has a small receipt icon drawn in SVG as the browser-tab icon. React draws everything inside `<div id="root">`.

### `frontend/src/main.jsx`
Starts React: it finds `#root` and renders `<App />` into it. It's Vite's default, unchanged.

### `frontend/src/App.jsx`
The first screen.
- **`useState`** holds data that changes: `health` (the API's answer) and `error`.
- **`useEffect`** with `[]` runs once when the page loads. It calls `fetch('/api/health/')` and stores the answer.
- **Three states** are shown: "Checking the receipts…" while loading, the system-check list when it arrives, and a red "BACKEND DOWN" chip if the call fails.
- **`StatusLine`** is a small reusable **component**, one row with a label and a status chip.

### `frontend/src/index.css`
- **Design tokens:** the Receipts colours and fonts as CSS variables (`--ink`, `--highlight`, …) in `:root`, defined once and used everywhere.
- **Look and accessibility:** dashed "perforated" borders, the chip styles, and a visible focus outline for keyboard users.
- **Responsive layout:** `.grid` uses `repeat(auto-fit, minmax(280px, 1fr))`, so the cards sit side by side on a laptop and stack on a phone.

### `frontend/eslint.config.js` and `frontend/.gitignore`
Vite defaults. ESLint checks the JavaScript for mistakes (`npm run lint`), and the `.gitignore` keeps `node_modules/` and `dist/` out of git.

---

## Concepts (Sat 24 Oct)

### How a request flows: one server, one URL
```
Browser → Django (gunicorn on Render)
          ├─ /api/...     → DRF view → JSON
          ├─ /static/...  → WhiteNoise → React's JS/CSS files
          ├─ /admin/      → Django admin
          └─ anything else → index.html → React draws the page, then calls /api/...
```
Because everything comes from one place, there are no cross-site (**CORS**) problems and only one Render service to deploy.

### Dev mode vs production mode
- **Dev:** two servers. `runserver` serves Django on port 8000 and `npm run dev` serves Vite on 5173. Changes appear instantly.
- **Production:** one server. `build.sh` builds React into plain files, and gunicorn runs Django, which serves those files with WhiteNoise.

### `collectstatic`
This gathers every static file (React's build plus the admin site's CSS) into one folder, `staticfiles/`. WhiteNoise serves from there and adds a fingerprint to each filename, so browsers can cache the files safely.

### Migrations
A migration is a saved instruction for changing the database ("create the invoices table"). `migrate` applies any that haven't run yet. Django's built-in tables were created today. Ours come once we write models.

---

## Sun 25 Oct: chat → invoice → approve

### `paypal_client/auth.py`
- **`get_access_token()`** swaps the Client ID and Secret for an OAuth access token (`POST /v1/oauth2/token`) and **caches** it in memory until a minute before it expires. A `threading.Lock` stops two requests fetching a token at once.
- **`paypal_request()`** is the one helper every PayPal call goes through.
  - It adds the `Authorization: Bearer …` header.
  - If PayPal answers 401, it refreshes the token and retries once.
  - Any failure becomes a **`PayPalError`** that keeps PayPal's `name`, `message` and `debug_id`.
- **Network problems** (no internet, blocked, timeout) become `PayPalError("NETWORK_ERROR")` instead of a long crash message.
- **Safety net:** it refuses any `PAYPAL_BASE_URL` that isn't the sandbox, so real money can never be touched.

### `paypal_client/invoices.py`
Wraps PayPal's **Invoicing API v2**, with endpoints checked against PayPal's official reference:
- `create_draft_invoice` → `POST /v2/invoicing/invoices`, with the header `Prefer: return=representation` so PayPal sends back the whole invoice, including its `id`.
- `send_invoice` → `POST /v2/invoicing/invoices/{id}/send`, which emails the client.
- `get_invoice` → `GET /v2/invoicing/invoices/{id}`
- `list_invoices` → `GET /v2/invoicing/invoices` (page size 1–100)
- `summarise` shrinks an invoice to six fields, so the AI isn't sent huge JSON.

### `invoices/management/commands/paypal_check.py`
A custom `manage.py` command that tests the PayPal connection on your computer: sign in, list invoices, and with `--draft`, create a £1 draft. Django finds it because it sits in an app's `management/commands/` folder. It never prints keys.

### `invoices/models.py`
The **`Invoice`** table: client, description, amount, currency, our `status`, plus PayPal's `paypal_id` and `paypal_status` once sent, and `last_error`.
- `Status` is a **`TextChoices`** list: NEEDS_APPROVAL → SENDING → SENT → PAID, or REJECTED.
- Money uses **`DecimalField`**, not float, because floats can't store 0.10 exactly.

### `invoices/serializers.py`
A DRF **serializer** converts an `Invoice` to JSON for React. The status fields are read-only, so nothing can change them except the approve and reject endpoints.

### `invoices/views.py` and `invoices/urls.py`
- `GET /api/invoices/` lists invoices.
- **`POST /api/invoices/<id>/approve/` is the only code that writes to PayPal:**
  1. **Claims** the invoice with one database UPDATE that only succeeds if its status is still NEEDS_APPROVAL. A double-click therefore gets "409 Conflict" instead of sending twice.
  2. Creates the PayPal draft, unless an earlier attempt already did.
  3. Sends it, then reads back PayPal's status.
  4. If PayPal fails, puts the invoice back to NEEDS_APPROVAL with the error, so you can retry.
- `POST /api/invoices/<id>/reject/` marks the draft REJECTED.

### `agent/prompts/invoice_agent_v1.md`
The agent's **system prompt**: the Receipts voice, what the tools do, and the rules. It never claims to have sent anything, never guesses missing details, and always mentions the Approve step. It's versioned (`_v1`), so we can improve it without losing the old one.

### `agent/tools.py`
The agent's three tools. Each has a **JSON schema** (sent to Claude so it knows the tool exists) and a **Python handler** (the code that runs it):
- `draft_invoice` saves a NEEDS_APPROVAL invoice in our database only.
- `list_invoices` reads our invoices, giving a short summary rather than a data dump.
- `list_paypal_invoices` reads PayPal's copy through `paypal_client`, read-only.

There is deliberately **no** send tool, and a test checks that.

### `agent/service.py`
**The tool-calling loop:**
1. Send Claude the conversation, the system prompt and the tool schemas.
2. If `stop_reason == "tool_use"`, run each requested tool, save it as a `ToolCall`, and send back a `tool_result`.
3. Repeat until Claude writes its text answer.

`MAX_STEPS = 5` stops runaway loops. The model name comes from `ANTHROPIC_MODEL`.

### `agent/models.py`
The **`ToolCall`** table logs every action the agent takes (tool, input, result, success or failure), grouped by `run_id`. It powers the "✓ Drafted invoice #0002" lines in the chat.

### `agent/views.py`
`POST /api/agent/chat/` receives the chat history from React, keeps only the last 20 messages (to keep costs down), runs the agent and returns `{reply, tool_calls}`.

### `*/admin.py`
Registers `Invoice` and `ToolCall` with Django's admin site at `/admin/`, a quick way to look at the data while building.

### Tests: `invoices/tests.py`, `agent/tests.py`, `paypal_client/tests.py`
13 tests, run with `python manage.py test`. PayPal is replaced by **mocks** (`unittest.mock.patch`): fakes that return set answers, so no network is used. They prove that:
- approve sends exactly once, and a second approve is refused
- PayPal failures can be retried
- no tool can send money
- tokens are cached, network errors are caught, and live PayPal is refused

### Frontend: `src/api.js`, `src/components/`
- **`api.js`** is one place for every call to Django, using `fetch`. It turns error responses into readable messages.
- **`Chat.jsx`** keeps the messages in state. It sends the conversation to `/api/agent/chat/` and shows the reply with "what I did" lines underneath. It has a screen-reader label on the input and "Checking the receipts…" while waiting.
- **`InvoiceList.jsx`** shows each invoice with its status chip and amount. Drafts get the **Approve & send via PayPal** and **Reject** buttons. It always reloads from the server afterwards, so the screen matches the database.
- **`StatusChip.jsx`** maps each status to its receipt-style badge (YOUR OK NEEDED, SENT, PAID ✓ …).
- **`App.jsx`** is the page layout. It loads invoices on start and passes `refreshInvoices` down, so the chat and list can trigger a reload. **Passing a function down as a prop** like this is the usual React way for child components to talk to the parent.

### `render.yaml` and `.python-version`
- **`render.yaml`** is a **Blueprint**: Render's settings as code. It defines one free web service, built with `./build.sh` and started with `migrate && gunicorn`, with `/api/health/` as the health check.
  - Non-secret settings are written in the file.
  - Secrets are marked `sync: false`, which means "ask me in the dashboard".
  - `DJANGO_SECRET_KEY` is generated by Render.
- **`.python-version`** pins Python 3.13, so Render matches your computer.

### Concept: human-in-the-loop
The AI **proposes** (a draft) and the human **disposes** (Approve or Reject). The rule is enforced in code, not just in the prompt: the agent has no tool that can send, and the approve endpoint is a button only you can press. This is a core point of the pitch.

---

## Concepts

### Environment variables and secrets
An **environment variable** is a named setting that lives outside the code, for example `ANTHROPIC_API_KEY=...`. The code reads it at run time instead of having the key written into a `.py` file.
- **Locally**, the values come from my `.env` file.
- **On Render**, I type them into the service's *Environment* settings page.

The same code runs in both places, and the keys never appear in git history. Even deleting a committed key later doesn't help, because it stays in the history forever.

### Sandbox vs live
PayPal has two separate worlds:
- **Sandbox:** `api-m.sandbox.paypal.com`, with fake money and test accounts.
- **Live:** `api-m.paypal.com`, with real money.

They have different credentials. This project only ever uses the sandbox. In it, my **business** test account is "me, the freelancer", and the **personal** test account is "the client" who receives invoices, pays them and later opens disputes.

### The APIMatic Context Plugin (installed Fri 23 Oct)
**What it is:** A Claude Code plugin made of **skills**. Skills are reference guides Claude loads while writing code, so it follows the documented way of calling PayPal instead of guessing from memory. This plugin is guidance only: it doesn't run any code or contact any servers.
**How it was installed:**
- APIMatic's installer is `npx context-plugins install paypal`. It normally downloads the plugin through GitHub's API, which this cloud workspace can't reach.
- So we cloned APIMatic's public marketplace repo (`context-plugins/plugin-marketplace`) and installed the PayPal plugin from that local copy into Claude Code.

**What it covers:** Guides for the APIMatic-generated **PayPal Server SDK** in Python, TypeScript and .NET:
- how to set up the client and OAuth 2.0 sign-in
- how to call endpoints and handle errors
- retries and testing

The SDK itself covers 5 areas: **Orders, Payments, Vault, Subscriptions and Transaction Search**.
**Important finding:** That SDK does **not** include the **Invoicing** or **Disputes** APIs, which are the two our core loop depends on. The general patterns (OAuth, error handling, retries) still apply to our own `paypal_client` code. **Decided (23 Oct):** we use the SDK's **Transaction Search** so the agent can cite PayPal's own record of the payment.

### Transaction Search, and why it's good evidence
Transaction Search is PayPal's history of every payment on an account. When a client disputes an invoice, the strongest neutral fact is PayPal's own record:
- **who paid** (`payer_info.email_address`)
- **how much** (`transaction_amount`)
- **when** (`transaction_initiation_date`)
- **which PayPal invoice it was for** (`cart_info.paypal_invoice_id`)

Our own delivery records prove the work was done. Transaction Search proves the payment matches the invoice. Together they make a stronger case.

### SDK (Software Development Kit)
A ready-made library for calling an API. Instead of building the HTTP request yourself (URL, headers, JSON), you call a Python function like `client.transaction_search.search_transactions(...)` and get typed Python objects back. APIMatic generates SDKs automatically from an API's specification.

### `UNSET` vs `None`
In this SDK, a field PayPal didn't send is `UNSET` (a special marker), **not** `None`. So the check is `if x is UNSET`, and `if x is None` would never be true.
