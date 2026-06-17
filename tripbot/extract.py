"""Vision extraction: a ticket image/PDF -> structured trip items.

Uses Claude Opus 4.8 vision with a strict JSON schema (structured outputs) so
the model can only ever return data shaped like our trip items. The source
image bytes are never written to disk and are dropped as soon as this returns
(privacy: tickets contain passport numbers, booking refs, full names).
"""

from __future__ import annotations

import base64
import json
import logging
import os

import anthropic

log = logging.getLogger(__name__)

MODEL = "claude-opus-4-8"

# The categories we know how to render. "other" is the catch-all so the model
# never has to invent a value outside the enum.
CATEGORIES = [
    "flight",
    "train",
    "bus",
    "ferry",
    "hotel",
    "car_rental",
    "activity",
    "restaurant",
    "other",
]


def _nullable_string(description: str) -> dict:
    return {"type": ["string", "null"], "description": description}


# Strict JSON schema. With structured outputs every property must appear in
# `required`, but any field that may be absent on a real ticket is nullable —
# so a ticket with no confirmation number returns null, never a guess.
ITEM_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "title": {
            "type": "string",
            "description": "Short identifier, e.g. 'SQ806' for a flight or 'Hilton Tokyo' for a hotel.",
        },
        "description": {
            "type": "string",
            "description": "One-line human label, e.g. 'Singapore to Tokyo Narita'.",
        },
        "provider": _nullable_string("Airline, rail operator, hotel chain, etc."),
        "origin": _nullable_string("Departure city/airport/station, or null."),
        "destination": _nullable_string("Arrival city/airport/station, or null."),
        "start_datetime": _nullable_string(
            "Departure / check-in in ISO 8601 (YYYY-MM-DDTHH:MM, local time as printed). "
            "Date-only is fine if no time is shown. Null if not present."
        ),
        "end_datetime": _nullable_string(
            "Arrival / check-out in ISO 8601, or null if not present."
        ),
        "location": _nullable_string("Street address or venue, for hotels/activities."),
        "confirmation_number": _nullable_string("Booking reference / PNR, or null."),
        "seat": _nullable_string("Seat / cabin / room number, or null."),
        "gate": _nullable_string("Gate / terminal / platform, or null."),
        "passenger_name": _nullable_string("Traveller name as printed, or null."),
        "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "description": "How confident you are that the key fields are correct.",
        },
        "notes": _nullable_string("Anything else useful and short, or null."),
    },
    "required": [
        "category",
        "title",
        "description",
        "provider",
        "origin",
        "destination",
        "start_datetime",
        "end_datetime",
        "location",
        "confirmation_number",
        "seat",
        "gate",
        "passenger_name",
        "confidence",
        "notes",
    ],
}

RESULT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "is_ticket": {
            "type": "boolean",
            "description": "True only if this image/document actually contains travel booking information.",
        },
        "document_kind": {
            "type": "string",
            "description": "Brief description of what you see, e.g. 'boarding pass', 'hotel confirmation', 'selfie', 'blurry photo'.",
        },
        "items": {
            "type": "array",
            "description": "One entry per distinct leg/booking. A round-trip ticket yields two items. Empty if not a ticket.",
            "items": ITEM_SCHEMA,
        },
    },
    "required": ["is_ticket", "document_kind", "items"],
}

EXTRACTION_PROMPT = """\
You are extracting travel itinerary data from a single uploaded image or PDF.

Rules:
- Only extract what is actually visible. NEVER invent or guess a value. If a \
field is not clearly present, return null for it.
- If the image is not a travel ticket/booking (e.g. a selfie, a random photo, \
a blurry or cropped image where you cannot read the details), set \
is_ticket=false, describe what you see in document_kind, and return an empty \
items array.
- A single document may contain multiple legs (e.g. an outbound and a return \
flight, or several connected segments). Return one item per leg.
- Use ISO 8601 for datetimes, preserving the local time exactly as printed. \
Do not convert time zones.
- Set confidence to "low" when the image is partly unreadable but you can still \
make out the key fields; use null for any individual field you cannot read.

Return the structured result."""


def _client() -> anthropic.Anthropic:
    # Reads ANTHROPIC_API_KEY from the environment.
    return anthropic.Anthropic()


def _source_block(media_bytes: bytes, media_type: str) -> dict:
    data = base64.standard_b64encode(media_bytes).decode("ascii")
    if media_type == "application/pdf":
        return {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": data},
        }
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": data},
    }


def extract_items(media_bytes: bytes, media_type: str) -> dict:
    """Send one ticket to the vision model and return the parsed result dict.

    Shape: {"is_ticket": bool, "document_kind": str, "items": [ ... ]}.
    Retries once on a transient API error or a malformed response. Raises on
    a second failure so the caller can show a friendly "try resending" message.
    """
    client = _client()
    content = [
        _source_block(media_bytes, media_type),
        {"type": "text", "text": EXTRACTION_PROMPT},
    ]

    last_err: Exception | None = None
    for attempt in (1, 2):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=8000,
                thinking={"type": "adaptive"},
                output_config={"format": {"type": "json_schema", "schema": RESULT_SCHEMA}},
                messages=[{"role": "user", "content": content}],
            )
            text = "".join(b.text for b in resp.content if b.type == "text")
            return json.loads(text)
        except (anthropic.APIError, json.JSONDecodeError) as err:
            last_err = err
            log.warning("extraction attempt %d failed: %s", attempt, err)

    assert last_err is not None
    raise last_err
