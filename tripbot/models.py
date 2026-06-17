"""Trip items, the in-memory session store, and small formatting helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

# MVP state: a plain dict keyed by Telegram user id. Survives only as long as
# the process does — a restart clears it, which is an accepted MVP trade-off.
# We deliberately keep only extracted fields here, never the source images.
_SESSIONS: dict[int, list["TripItem"]] = {}

# Don't let a single session grow unbounded.
MAX_ITEMS_PER_SESSION = 100

CATEGORY_ICONS = {
    "flight": "✈️",
    "train": "🚆",
    "bus": "🚌",
    "ferry": "⛴️",
    "hotel": "🏨",
    "car_rental": "🚗",
    "activity": "🎟️",
    "restaurant": "🍽️",
    "other": "📍",
}


@dataclass
class TripItem:
    category: str
    title: str
    description: str = ""
    provider: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    location: Optional[str] = None
    confirmation_number: Optional[str] = None
    seat: Optional[str] = None
    gate: Optional[str] = None
    passenger_name: Optional[str] = None
    confidence: str = "medium"
    notes: Optional[str] = None

    @classmethod
    def from_extracted(cls, data: dict) -> "TripItem":
        known = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in data.items() if k in known})

    @property
    def icon(self) -> str:
        return CATEGORY_ICONS.get(self.category, "📍")

    @property
    def start(self) -> Optional[datetime]:
        return parse_dt(self.start_datetime)

    @property
    def end(self) -> Optional[datetime]:
        return parse_dt(self.end_datetime)

    @property
    def needs_review(self) -> bool:
        """Flag items the user should eyeball: low confidence, or a timed
        transport leg with no readable departure time."""
        if self.confidence == "low":
            return True
        if self.category in {"flight", "train", "bus", "ferry"} and self.start is None:
            return True
        return False

    def summary_line(self) -> str:
        """One-line confirmation, e.g. '✈️ SQ806 · SIN→NRT · 14 Mar 09:05'."""
        parts = [f"{self.icon} {self.title}".strip()]
        route = _route(self.origin, self.destination)
        if route:
            parts.append(route)
        when = self.start
        if when:
            parts.append(_fmt_dt(when))
        elif self.location:
            parts.append(self.location)
        line = " · ".join(p for p in parts if p)
        if self.needs_review:
            line += "  ⚠️ needs review"
        return line


def parse_dt(value: Optional[str]) -> Optional[datetime]:
    """Best-effort ISO 8601 parse. Tolerates a trailing 'Z' and date-only."""
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M", "%Y-%m-%dT%H:%M:%S"):
            try:
                return datetime.strptime(value.strip()[: len(fmt) + 4], fmt)
            except ValueError:
                continue
    return None


def _route(origin: Optional[str], destination: Optional[str]) -> str:
    if origin and destination:
        return f"{origin}→{destination}"
    return origin or destination or ""


def _fmt_dt(dt: datetime) -> str:
    # Drop a midnight time that almost certainly means "date only".
    if dt.hour == 0 and dt.minute == 0:
        return dt.strftime("%-d %b")
    return dt.strftime("%-d %b %H:%M")


# --- session store -------------------------------------------------------

def get_items(user_id: int) -> list[TripItem]:
    return _SESSIONS.get(user_id, [])


def add_item(user_id: int, item: TripItem) -> bool:
    items = _SESSIONS.setdefault(user_id, [])
    if len(items) >= MAX_ITEMS_PER_SESSION:
        return False
    items.append(item)
    return True


def clear(user_id: int) -> None:
    _SESSIONS.pop(user_id, None)


def _sort_key(item: TripItem) -> tuple[bool, datetime]:
    dt = item.start
    if dt is None:
        return (True, datetime.max)
    # Normalise to naive so tz-aware and naive tickets sort together.
    return (False, dt.replace(tzinfo=None))


def sorted_items(items: list[TripItem]) -> list[TripItem]:
    """Chronological order; undated items sink to the bottom."""
    return sorted(items, key=_sort_key)
