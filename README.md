# Trip-PDF Bot ✈️📄

Send ticket photos to a Telegram bot, type `/done`, get back **one clean PDF**
with all your trip info extracted and arranged in chronological order.

> The North Star: a real traveler runs their messy pile of tickets through it
> and gets a PDF they'd actually use. See [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

## How it works

```
ticket photos/PDFs ──▶ Claude vision extract ──▶ /done ──▶ WeasyPrint PDF
        (in memory, never written to disk; dropped after the PDF is sent)
```

- **Extraction** — each image/PDF goes to Claude Opus 4.8 vision with a strict
  JSON schema, so it returns structured trip data and never invents fields. A
  blurry ticket yields nulls, not guesses; a selfie is politely rejected.
- **State** — a simple in-memory dict keyed by Telegram user id, holding only
  the extracted fields. A restart clears it (accepted MVP trade-off).
- **Privacy** — source ticket images are read then discarded. Nothing is
  written to disk; the session (with its PII) is cleared the moment the PDF
  is delivered.

## Project layout

```
tripbot/
├── bot.py        # Telegram handlers, long-polling entry point
├── extract.py    # image/PDF -> structured items (Claude vision)
├── models.py     # TripItem, in-memory session store, sorting/formatting
├── pdf.py        # sorted items -> PDF (HTML template via WeasyPrint)
├── requirements.txt
└── .env.example
docs/BUILD_PLAN.md
```

## Setup

### 1. Credentials (Build Plan, Phase 0)

- **Telegram bot token** — message [@BotFather](https://t.me/BotFather),
  send `/newbot`, follow the prompts, copy the token.
- **Anthropic API key** — from the
  [Anthropic Console](https://console.anthropic.com) → API keys.

```bash
cp tripbot/.env.example tripbot/.env
# edit tripbot/.env and paste both values
```

### 2. System dependencies (WeasyPrint)

WeasyPrint renders the PDF and needs Pango/Cairo/GDK-PixBuf at the system level.

```bash
# Debian / Ubuntu
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 libffi-dev libcairo2

# macOS (Homebrew)
brew install pango gdk-pixbuf libffi
```

See the [WeasyPrint install docs](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html)
if you hit a missing-library error.

### 3. Python dependencies

```bash
cd tripbot
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Run

```bash
python bot.py
```

Then open your bot in Telegram, send a ticket photo, and type `/done`.

## Using it

| Command | What it does |
|---------|--------------|
| `/start` | Instructions |
| (send photo/PDF) | Reads the ticket, replies with a confirmation line |
| `/done` | Builds and sends the trip PDF, then clears your session |
| `/reset` | Clears your session without building a PDF |

Items the model wasn't sure about (low confidence, or a flight/train with no
readable time) are flagged **⚠️ needs review** in both the chat confirmation
and the PDF, so nothing is silently wrong.

## Status vs. the build plan

Implemented: Phases 1–4 (skeleton, extraction, synthesis+PDF, resilience).
Phase 0 is your credentials above; Phase 5 is the real-user validation — run
a real trip through it and note how many fields needed correcting.
