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
**What:** Currently just the title. It will become the front page judges read: the problem, features, architecture diagram, setup steps, the PayPal APIs and AI tools used, and the AG Grid and APIMatic sections.
**When:** Written properly in the final stretch (Mon 9 Nov), once the features are frozen.

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
**Important finding:** That SDK does **not** include the **Invoicing** or **Disputes** APIs, which are the two our core loop depends on. The general patterns (OAuth, error handling, retries) still apply to our own `paypal_client` code. Exactly how we use APIMatic "meaningfully" for the prize is an open decision.
