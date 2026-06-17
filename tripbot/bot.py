"""Telegram Trip-PDF bot.

Send ticket photos/PDFs, type /done, get back one clean chronological PDF.
Source images are extracted then dropped — never written to disk or retained.
"""

from __future__ import annotations

import asyncio
import io
import logging
import os

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

import models
from extract import extract_items
from models import TripItem
from pdf import build_pdf

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("tripbot")

START_TEXT = (
    "👋 *Trip-PDF Bot*\n\n"
    "Send me photos or PDFs of your travel tickets — flights, trains, hotels, "
    "anything. Send as many as you like, across as many messages as you like.\n\n"
    "When you're done, type /done and I'll send back a single clean PDF with "
    "everything sorted in order.\n\n"
    "Your ticket images are read and then discarded — I only keep the trip "
    "details until your PDF is sent.\n\n"
    "Commands:\n"
    "• /done — build your trip PDF\n"
    "• /reset — clear everything and start over"
)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_markdown(START_TEXT)


async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    models.clear(update.effective_user.id)
    await update.message.reply_text("🧹 Cleared. Send tickets whenever you're ready.")


async def _handle_media(
    update: Update, media_bytes: bytes, media_type: str
) -> None:
    user_id = update.effective_user.id
    await update.effective_chat.send_action(ChatAction.TYPING)

    try:
        result = await asyncio.to_thread(extract_items, media_bytes, media_type)
    except Exception as err:  # noqa: BLE001 — surface a friendly message, never hang
        log.exception("extraction failed: %s", err)
        await update.message.reply_text(
            "😕 I couldn't read that one. Try resending a clearer photo."
        )
        return

    if not result.get("is_ticket") or not result.get("items"):
        kind = result.get("document_kind") or "anything"
        await update.message.reply_text(
            f"🤔 I couldn't find a ticket here (looks like {kind}). "
            "Send me a travel ticket or booking and I'll add it."
        )
        return

    added: list[TripItem] = []
    for raw in result["items"]:
        item = TripItem.from_extracted(raw)
        if models.add_item(user_id, item):
            added.append(item)

    if not added:
        await update.message.reply_text(
            "⚠️ Your trip already has the maximum number of items. "
            "Type /done to build the PDF or /reset to start over."
        )
        return

    lines = "\n".join(it.summary_line() for it in added)
    total = len(models.get_items(user_id))
    await update.message.reply_text(
        f"Added:\n{lines}\n\n({total} item(s) so far — type /done when ready.)"
    )


async def on_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    photo = update.message.photo[-1]  # largest rendition
    tg_file = await photo.get_file()
    data = bytes(await tg_file.download_as_bytearray())
    await _handle_media(update, data, "image/jpeg")


async def on_document(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    doc = update.message.document
    mime = (doc.mime_type or "").lower()
    if mime == "application/pdf":
        media_type = "application/pdf"
    elif mime in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        media_type = mime
    else:
        await update.message.reply_text(
            "I can read photos and PDF tickets. That file type isn't supported."
        )
        return
    tg_file = await doc.get_file()
    data = bytes(await tg_file.download_as_bytearray())
    await _handle_media(update, data, media_type)


async def cmd_done(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    items = models.get_items(user_id)

    if not items:
        await update.message.reply_text(
            "You haven't sent any tickets yet 🙂 Send a photo or PDF first, "
            "then type /done."
        )
        return

    await update.effective_chat.send_action(ChatAction.UPLOAD_DOCUMENT)
    try:
        pdf_bytes = await asyncio.to_thread(build_pdf, items)
    except Exception as err:  # noqa: BLE001
        log.exception("pdf build failed: %s", err)
        await update.message.reply_text(
            "😕 Something went wrong building your PDF. Your items are still "
            "saved — try /done again."
        )
        return

    buf = io.BytesIO(pdf_bytes)
    buf.name = "trip.pdf"
    await update.message.reply_document(
        document=buf,
        filename="trip.pdf",
        caption=f"Here's your trip — {len(items)} item(s), in order. ✈️",
    )
    # Deliver-then-discard: drop the session (and its PII) now the PDF is sent.
    models.clear(user_id)


def main() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass  # dotenv is optional; env vars may be set directly

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise SystemExit("TELEGRAM_BOT_TOKEN is not set. See README / .env.example.")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("ANTHROPIC_API_KEY is not set. See README / .env.example.")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_start))
    app.add_handler(CommandHandler("reset", cmd_reset))
    app.add_handler(CommandHandler("done", cmd_done))
    app.add_handler(MessageHandler(filters.PHOTO, on_photo))
    app.add_handler(MessageHandler(filters.Document.ALL, on_document))

    log.info("Trip-PDF bot starting (long polling)…")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
