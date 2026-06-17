# Running the Trip-PDF Bot

A quick checklist for running the bot on your own machine. For how it works
and the project layout, see [README.md](README.md).

## One-time setup

### 1. Get the code
```bash
git clone https://github.com/weikhing95-blip/cactus.git
cd cactus
git checkout claude/happy-mayer-kqo2ew
```

### 2. WeasyPrint system libraries (needed for PDF rendering)
```bash
# macOS
brew install pango gdk-pixbuf libffi

# Debian / Ubuntu
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 libffi-dev libcairo2
```

### 3. Python dependencies
```bash
cd tripbot
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Credentials
```bash
cp .env.example .env
```
Edit `.env` and paste your two values:
```
TELEGRAM_BOT_TOKEN=...   # from @BotFather
ANTHROPIC_API_KEY=...    # from console.anthropic.com (needs credits)
```
`.env` is git-ignored — it stays on your machine and is never committed.

## Every time you run it

```bash
cd tripbot
source .venv/bin/activate
python check_creds.py     # optional: expect two ✓ lines
python bot.py             # starts the bot — leave this terminal open
```

You'll see `Trip-PDF bot starting (long polling)…`. The bot is now live.

## Using it (you and anyone you share with)

1. Open your bot: `https://t.me/<your_bot_username>` (the username you gave
   @BotFather). Share that link with anyone — each person gets their own
   private session.
2. Tap **Start** (or send `/start`).
3. Send ticket photos or PDFs — the bot confirms each one.
4. Send **`/done`** → it replies with your trip PDF.
5. **`/reset`** clears your tickets without building a PDF.

## Good to know

- **The bot only responds while `python bot.py` is running.** Close the
  terminal or sleep the machine → the bot goes offline, and any tickets people
  haven't `/done`'d yet are cleared (state is in-memory by design).
- **Long-polling means no public URL or port forwarding** — the bot just needs
  outbound internet. It works fine from a home laptop.
- **Your Anthropic key pays for everyone** who uses the link. Keep an eye on
  usage if you share it widely. (When you want to cap or restrict access, that's
  a small change away — just ask.)
- For an always-on bot that survives laptop sleep, run it on a small
  always-on host later (a Dockerfile / deploy guide can be added when you're
  ready).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `TELEGRAM_BOT_TOKEN is not set` | Fill in `.env`, or `cp .env.example .env` first |
| `credit balance is too low` | Add credits at console.anthropic.com → Plans & Billing |
| `cannot load library 'libpango…'` | Install the WeasyPrint system libs (step 2) |
| Bot doesn't reply | Make sure `python bot.py` is still running with no errors |
