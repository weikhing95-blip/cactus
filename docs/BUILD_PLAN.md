# Telegram Trip-PDF Bot — Build Plan
*One MVP, gated by four review hats. Goal-driven, step-by-step, from zero to a validated bot.*

---

## 🎯 North Star
> A user sends ticket images to a Telegram bot, types `/done`, and receives a single clean PDF with all their trip information synthesized and arranged in chronological order.

One hypothesis under test: **the synthesized PDF is good enough that the user would actually use it.** Everything below serves that and nothing else.

---

## The review board (requirements challenged before build)

### 👔 PM hat — guards scope & user value
**Raised:**
- Scope must be one pipeline: images → extract → `/done` → PDF. No accounts, no editing, no splitting, no multi-trip.
- The PDF is the *only* output. No chat-timeline view.
- Success isn't "it runs" — it's "the real user keeps using it."

**Signs off when:** the original struggling user gets a PDF from a real trip and says they'd use it again.

### 🧪 QA hat — guards correctness & edge cases
**Raised these must-handle cases:**
- Multiple images in one trip; images sent across several messages.
- A **bad image** (blurry/cropped) → must not silently invent data.
- A **non-ticket image** (a selfie) → must not crash or fabricate an item.
- `/done` with **zero images** sent → friendly message, no crash.
- **Ordering** — items must sort correctly by date/time in the PDF.
- **Missing fields** — a ticket with no confirmation number still renders cleanly.
- Multi-page PDF uploads.

**Signs off when:** the edge-case checklist (Phase 4) passes.

### 🛠️ Engineering hat — guards buildability & simplicity
**Raised:**
- **State:** the bot must remember a user's images between messages until `/done`. Use a simple in-memory dict keyed by Telegram user ID for MVP (accept that a restart clears it).
- **PDF:** render via an HTML template → PDF (WeasyPrint) — far easier to style nicely than drawing with a low-level lib.
- **Failure handling:** the model API will occasionally fail or return non-JSON; wrap and retry, never hang the user.
- Single script, single small host. No microservices.

**Signs off when:** the pipeline runs end-to-end on one machine with one token + one API key.

### 🔒 Security/Privacy hat — guards PII
**Raised:**
- Tickets contain passport numbers, booking refs, full names.
- **Decision required before any storage:** extract-then-**discard** the source image (don't persist raw tickets in MVP). Keep only the extracted fields in memory, drop them after the PDF is sent.

**Signs off when:** no raw ticket image is written to disk or retained after the PDF is delivered.

---

## Step-by-step build plan

### Phase 0 — Decisions & setup *(PM + Security gate)*
**Goal:** lock the handful of decisions and credentials needed before code.
**Steps:**
1. Create the bot via Telegram **@BotFather** → get the bot token.
2. Get a **vision-model API key**.
3. Confirm two decisions in writing: PDF triggers on **`/done`**; source images are **discarded after extraction** (no retention).
**✅ Done when:** token + key in hand, both decisions recorded.

### Phase 1 — Skeleton bot *(Engineering)*
**Goal:** prove the plumbing — the bot is alive and receives files.
**Steps:**
1. Bot responds to `/start` with one-line instructions.
2. Bot receives a photo/PDF and replies "📩 Got it."
**✅ Done when:** sending a photo gets an acknowledgement back.

### Phase 2 — Extraction *(Engineering, QA gate)*
**Goal:** turn each uploaded image into structured data.
**Steps:**
1. On file received: download it, send it + the **extraction prompt** (from the Spike Kit) to the vision model.
2. Parse the returned JSON; store the item in the user's in-memory session.
3. Reply with a one-line confirmation ("✈️ Added: SQ806, SIN→NRT, 14 Mar 09:05").
**✅ Done when:** a real ticket produces a correct confirmation line.
**🧪 QA gate:** test a clean ticket, a blurry ticket (expect nulls, not guesses), and a non-ticket image (expect a graceful "couldn't find a ticket here").

### Phase 3 — Synthesis + PDF *(Engineering, QA gate)*
**Goal:** `/done` produces the deliverable.
**Steps:**
1. On `/done`: gather all items in the session, **sort chronologically**.
2. Render an HTML template (header = trip dates + destination; body = sorted items grouped by day) → PDF via WeasyPrint.
3. Send the PDF back as a Telegram document; clear the session.
**✅ Done when:** 3 tickets + `/done` → a clean, correctly-ordered PDF arrives in chat.
**🧪 QA gate:** ordering correct; a missing field renders gracefully; `/done` with no items gives a friendly prompt, not an error.

### Phase 4 — Resilience & polish *(QA + PM gate)*
**Goal:** survive the obvious real-world failure paths.
**Steps:**
1. Low confidence / unreadable required field → mark the item "⚠️ needs review" in the PDF (and/or ask the user).
2. Model API error or non-JSON → retry once, then a friendly "couldn't read that one, try resending."
3. Add `/reset` (clear session) and make `/start` instructions clear.
**✅ Done when:** the full QA edge-case checklist passes without a crash.

### Phase 5 — Real-world validation *(PM gate)*
**Goal:** prove the hypothesis with a real human.
**Steps:**
1. Give the bot to the original user who struggles with this.
2. Have them run a **real trip's** tickets through it.
3. Capture: did the PDF come out usable? How many fields needed correcting?
**✅ Done when:** they get a PDF they'd genuinely use, and you've recorded the correction rate.

---

## ✅ Definition of Done (MVP ships)
All four hats sign off:
- 👔 **PM:** a real user produced a usable trip PDF and would use it again.
- 🧪 **QA:** every edge case in Phase 4 handled without a crash or a fabricated value.
- 🛠️ **Engineering:** runs end-to-end on one host with one token + one key.
- 🔒 **Security:** no raw ticket image retained after the PDF is sent.

---

## 🚫 Explicitly out of scope (PM guard against creep)
Accounts · editing items in-chat · cost splitting · groups · multi-currency · multiple simultaneous trips · the standalone app · itinerary planning. All deferred to post-validation.

---

## Suggested order of attack
`Phase 0 → 1 → 2 → 3` gets you a working bot that produces a PDF — that's the demoable core, likely a day or two of focused build. `Phase 4` makes it not embarrassing. `Phase 5` tells you if it's real. Don't skip Phase 5 — it's the only phase that answers the actual question.
