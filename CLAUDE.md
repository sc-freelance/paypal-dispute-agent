# Kickoff Prompt: PayPal AI Hackathon Project

You are my coding partner for the **PayPal AI Hackathon** (Devpost). Read this whole brief before doing anything. It is the source of truth for the project, and I'll keep it in the repo as `CLAUDE.md`.

## Decisions log

Decisions Saad has made. These override any open question further down this brief.

| Date | Decision | Choice |
|---|---|---|
| Thu 22 Oct 2026 | Backend framework | **Django + Django REST Framework** (not FastAPI) |
| Thu 22 Oct 2026 | Frontend language | **JavaScript** (not TypeScript) |
| Thu 22 Oct 2026 | Serving the React build | **Django serves the built React app itself** (one Render web service, not a separate static site) |
| Fri 23 Oct 2026 | Project name and personality | **Receipts** (see section 6) |
| Fri 23 Oct 2026 | How we use APIMatic | **Option 1:** APIMatic's generated PayPal Python SDK powers **Transaction Search**, PayPal's own payment record, used as dispute evidence. Invoicing and Disputes (not in that SDK) are hand-written following the same patterns. Plan and contract sheet: `paypal-plan.md`. |
| Sun 25 Oct 2026 | Schedule | **Transaction Search moves to Week 2** (it's only needed once a dispute exists). |
| Sun 25 Oct 2026 | Testing PayPal | Claude's workspace can't reach PayPal, so **PayPal calls are tested on Saad's computer**: Claude pushes, Saad pulls and runs `python manage.py paypal_check` (or the app) and pastes the output. |
| Sun 25 Oct 2026 | Approval design | The agent can only **draft** invoices in our database. The PayPal draft is created and sent only when Saad clicks **Approve** (`POST /api/invoices/<id>/approve/`). No agent tool can send or move money. |
| Wed 28 Oct 2026 | Build order | **UI first:** build all screens (dispute screens, review screen, AG Grid dashboard, insights, demo mode, polish) with sample data, then wire up the dispute backend. Known risk, accepted: screens may need adjusting once real dispute data arrives, and the core loop lands later. |

---

## 1. Who I am and how we work together

I'm Saad, a 19-year-old junior developer in Manchester working towards a data analysis / data science career.

- **Skills:** Python, pandas, Matplotlib, scikit-learn and basic React, plus strong maths and an art & design background.
- **Experience:** I've built and deployed an AI chat agent with tool calling before.
- **New to me:** Django/DRF, PayPal's APIs and Render.
- **Setup:** I'm entering solo, with **only 7–14 hours a week**. Time is the main constraint, so efficiency matters more than ambition.

**Our working rules (non-negotiable):**

1. **I make the decisions.** For anything that shapes the product (features, architecture, naming, UI direction, libraries, scope cuts), give me 2–3 options with short trade-offs and a recommendation, then **wait for my answer**. Small implementation details within an agreed structure are yours.
2. **You do the heavy lifting.** That means the PayPal API wrappers, Django REST API routes, serializers, React boilerplate, AG Grid setup, Render config and debugging. Move fast and don't gold-plate.
3. **I must understand every file.**
   - Read the whole of any existing file before editing it.
   - After creating or significantly changing a file, explain in plain English what it does, why it exists, how it connects to the rest of the app, and any concept a junior dev might not know.
   - Keep a running `docs/LEARNING.md` with a short entry per file or concept.
   - Now and then, ask me one quick check question.

   I need to be able to explain this code to judges and in job interviews.
4. **Make small, frequent commits** with clear messages, so the GitHub history shows the work happened during the hackathon. Never commit secrets: use `.env` plus a committed `.env.example`.
5. **Verify, don't guess.** For PayPal endpoints and payloads, check the official PayPal docs or the APIMatic PayPal context, not memory. If something is uncertain, say so.
6. **Respect my time.** Each session should end with something working and committed. If a task is likely to take more than ~2 hours, tell me before starting and suggest a smaller version.

---

## 2. The hackathon: what matters

**Theme:** "Build what's next with PayPal and AI." There are no tracks. The hard requirement is that the project **meaningfully uses both PayPal (sandbox) and AI**.

**Deadline:** Thursday 12 Nov 2026, 12:00 PT (8:00pm UK). **Our internal deadline is Wednesday 11 Nov.**

**The submission must include:**
- A working build: a hosted URL on Render **and** complete setup/run instructions in the README.
- A **public** GitHub repo with an MIT licence visible in the About section.
- A text description.
- A list of the AI tools used and how they were used.
- A public YouTube demo video **under 3 minutes**, with no copyrighted music.

**Judging:** five equally weighted criteria.
- **Technological Implementation:** a non-trivial, working use of PayPal and AI.
- **Design:** a complete, coherent product.
- **Potential Impact:** a real problem for a real audience.
- **Innovation:** a novel idea.
- **Presentation:** the video shows the project working end to end, with a clear pitch.

Judges may judge from the video and description alone, so **the demo must be rock solid.**

**Judging runs 1–15 Dec 2026.** The hosted app must still work then.

## 3. My prize strategy (a realistic small win)

I've never won a hackathon prize. **The goal is one solid win, not 1st place.** A project can win at most one Grand or Honorable Mention prize **plus** one Sponsor prize.

- **Primary target: Best Use of AG Grid** (5 winners: $5k, $2k, and $1k ×3). Use it properly: status cell renderers, filters, grouping and aggregation, conditional styling and pinned totals. A plain table won't win this.
- **Backup sponsor target: Best Use of APIMatic** (3 winners). Use its PayPal Context Plugin while building the integration, and document how it helped.
- **Host on Render.** This also makes us eligible for the Render credit prizes.
- **Stretch Honorable Mention targets:** Most Impactful (freelancers losing money to disputes) and Best Demo Delivery (polish and storytelling).

Every sponsor tool must be used **meaningfully**. Token usage won't win.

---

## 4. The product: trimmed MVP

**Pitch:** an AI agent that helps freelancers **keep the money they've earned** by defending PayPal disputes with real evidence.

**Audience:** solo freelancers and small service businesses. They sell intangible services, so when a client claims "not received" or "not as described", there's no tracking number to prove otherwise. Many lose disputes because they respond late or badly.

### The core loop (this IS the project)

```
Invoice sent → client disputes it → AI drafts evidence from real records → I approve → evidence submitted → dispute settled
```

**Must-have features, in build order:**

1. **Simple invoicing.** A minimal chat command or form creates and sends a PayPal invoice through Invoicing API v2, and invoices can be listed. Use Claude tool calling, so the agent pattern is in place from day one.
2. **⭐ AI Dispute-Defence Agent (the headline).**
   - Fetch dispute details from the Disputes API: the reason, the evidence PayPal wants and the response deadline.
   - Match the dispute to our records: the invoice, the agreed scope or messages, the delivery timestamps and the delivered files.
   - Have Claude draft a factual, structured response, with **every claim linked to its source record**, and show those links in the UI.
   - **Human approval is required.** I review, edit, approve or reject. Only after approval does the app submit through `POST /v1/customer/disputes/{id}/provide-evidence` (multipart).
   - **Honesty rule:** the agent only uses evidence that actually exists in our records. It never invents facts.
3. **AG Grid dashboard.** One grid of invoices and disputes showing status badges, amounts, days overdue and dispute deadline countdowns.
   - Filters: "Disputed", "Needs my approval" and "Overdue".
   - Grouped totals.
   - A small side panel of pandas-computed insights, e.g. "£450 at risk across 2 open disputes".

**Every PayPal write action** (sending an invoice, submitting evidence) needs an explicit approval click from me. This is a deliberate design choice to highlight in the pitch.

### Deliberately cut, to protect the time budget

- **Webhooks.** Use a "Sync with PayPal" button, plus a refresh when the dashboard loads. Webhook signature verification is too fiddly for the time we have.
- **Bryntum.** Dropped entirely.
- **AI payment chase-ups.** Dropped.
- **Evidence-pack PDF.** A *stretch goal only*. Submit the evidence as structured notes first.

If we're ahead of schedule in week 3, propose **one** stretch item and let me choose.

### Sandbox and demo data

- The PayPal sandbox has **sandbox-only Disputes endpoints** to create a dispute, change its reason and settle it. Use `OTHER` as the evidence type in the sandbox. Check the exact endpoints in the docs.
- Write a `seed_demo` management command. It should create realistic clients, invoices, scope messages, delivery records and a few sandbox disputes, so the whole demo runs from a clean state in one command.
- Add a "Demo mode" banner and a **Reset demo** button on the hosted site, so judges can click around safely.

---

## 5. Tech stack

**Backend: Django + Django REST Framework.**
- Apps along the lines of `paypal_client`, `invoices`, `disputes`, `agent` and `insights`.
- **Decided (22 Oct): keep Django.** Django is better for my CV.

**PayPal wrapper (`paypal_client/`).**
- A clean service layer covering OAuth token caching, invoicing and disputes.
- Sandbox only, configured with env vars.
- Typed, well-commented functions. These double as the AI's tools.

**AI: the Anthropic Python SDK, using my `ANTHROPIC_API_KEY`.**
- Read the model name from an `ANTHROPIC_MODEL` env var.
- **Use `claude-haiku-5-5` during development** to keep costs low, and **`claude-sonnet-5-5` for the final demo and hosted version**.
- Use tool calling with the PayPal wrapper functions.
- Keep system prompts in versioned files under `agent/prompts/`.
- Log every tool call, so the UI can show "what the agent did". This also makes a good video moment.
- Keep token usage lean: send summaries, not raw data dumps. I've set a spend limit in the Anthropic Console.

**Frontend: React (Vite).**
- **Decided (22 Oct): JavaScript.** I know basic React, so readability matters.
- Use **AG Grid Community** (MIT).

**APIMatic.**
- Set up the APIMatic Context Plugin for PayPal in this Claude Code session in week 1. Check APIMatic's hackathon docs for the install steps, and ask me to do any account steps.
- Use it when writing the PayPal integration.
- **Decided (23 Oct):** the plugin's SDK covers Orders, Payments, Subscriptions, Transaction Search and Vault, but **not** Invoicing or Disputes. We use the SDK for Transaction Search (evidence of payment). See the Decisions log and `paypal-plan.md`.
- Log in `docs/APIMATIC.md` how it helped. That becomes the README section for the APIMatic judges.

**Hosting: Render, via a `render.yaml` blueprint.**
- **Decided (22 Oct): Django serves the built React app itself**, so there is one Render web service and one URL.
- **Database plan:** Render's free Postgres expires 30 days after creation, plus a 14-day grace period, and judging runs 1–15 Dec. To handle this:
  - Use SQLite locally.
  - **Seed the demo data automatically on startup**, so the demo survives a database reset.
  - Remind me to create the production Postgres database **no earlier than ~10 Nov**. Or I may choose to pay for a Starter plan; offer me the trade-off.
- Free web services sleep after 15 minutes of inactivity. Mention this in the README, e.g. "first load may take ~1 minute".

---

## 6. Personality: make it memorable (cheap, high impact)

The project needs a **distinct personality** so it stands out from generic "AI payment dashboards".

**Decided (23 Oct): "Receipts".** Tagline: *"You did the work. We keep the receipts."* (Paper Trail and Exhibit A were the other two options.)

- **Voice:** a brisk, upbeat friend who always kept the receipts. Short sentences, plain words, never panicky, never salesy, never silly.
  - Empty state: "No receipts yet. Send your first invoice and I'll start keeping them."
  - Loading: "Checking the receipts…"
  - Dispute found: "Ahmed says the logo pack never arrived. Good news: we've got receipts. Delivered 14 Oct, 16:02. Draft's ready, so give it a look before I send."
- **Visual language:** a thermal-receipt look on a clean modern UI.
  - Colours: receipt off-white `#FAF9F4`, ink `#111111`, highlighter yellow `#F2E35B`, alert red `#B3261E`, faded ink `#595959`.
  - Fonts: **Space Grotesk** (headings and body), **Space Mono** (badges, amounts, IDs).
  - Dashed "perforated" dividers; the highlighter marks what needs attention.
  - Status chips: SENT (dashed grey), PAID ✓ (outlined), DISPUTED (red), YOUR OK NEEDED (highlighter), DEFENDED (bold outline), \*\*\* WON \*\*\* (yellow on black).
  - The mock-ups live on the "Personality Options" design canvas.
- The personality lives in the UI: empty states, loading messages and agent chat. **The evidence text sent to PayPal stays strictly professional.**

The design must be accessible (good contrast, keyboard navigation) and responsive. I'll lead on visual design. You implement it cleanly.

---

## 7. Timeline (today is Mon 19 Oct 2026; I have ~7–14 hours a week)

- **Week 1, to Sun 25 Oct:**
  - Repo with MIT licence.
  - Django + React skeleton and `.env.example`.
  - APIMatic plugin set up.
  - PayPal OAuth and an invoicing wrapper.
  - Create a sandbox invoice through the agent.
  - **First Render deploy.**
- **Week 2, to Sun 1 Nov:**
  - The Dispute-Defence Agent end to end in the sandbox: create dispute → AI draft with source links → approve → submit evidence → settle.
  - The `seed_demo` command.
- **Week 3, to Sun 8 Nov:**
  - AG Grid dashboard and insights.
  - Personality and visual polish.
  - Demo mode with reset.
  - Bug bash on the hosted site.
- **Mon 9 – Wed 11 Nov:**
  - Feature freeze.
  - Create the production database.
  - README: problem, features, architecture diagram, setup, PayPal APIs used, AI tools (the Claude API; built with Claude Code + APIMatic), and the AG Grid and APIMatic sections.
  - Demo video script.
  - **Submit on Wednesday 11 Nov.**

If we fall behind, **protect the core loop** and cut polish. Ask me before cutting anything.

## 8. Definition of done

- [ ] The hosted Render URL works from a fresh browser, and demo mode resets cleanly.
- [ ] A judge can clone the repo, follow the README and run the app locally.
- [ ] The core loop runs end to end in under 2 minutes of screen time.
- [ ] AG Grid and APIMatic are each used meaningfully and documented in their own README section.
- [ ] No secrets in the repo, and the MIT licence is visible.
- [ ] `docs/LEARNING.md` covers every file, and I can explain the architecture in my own words.
- [ ] A demo video script exists: problem (20s) → live demo (2 min) → tech (20s).
- [ ] The production database will survive until 15 Dec, or auto-seed covers it.

---

## 9. Your first task

**Don't write any code yet.**

1. Summarise this brief in under 10 bullet points, so I know you've understood the goals, prize targets, time budget and rules.
2. List the decisions I need to make first, each with options and your recommendation:
   - Django vs FastAPI
   - JavaScript vs TypeScript
   - how to serve the React build
   - project name and personality (3 options)
3. Propose the repo folder structure and a Week 1 task list sized for about 10 hours.

Then wait for my answers.
