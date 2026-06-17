"""Render sorted trip items into a clean single-file PDF via WeasyPrint."""

from __future__ import annotations

from collections import OrderedDict
from datetime import datetime
from html import escape
from typing import Optional

from jinja2 import Environment
from weasyprint import HTML

from models import TripItem, sorted_items

_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 2cm 1.8cm; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
         color: #1d2733; font-size: 11pt; line-height: 1.45; }
  header { border-bottom: 2px solid #1d2733; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 22pt; margin: 0 0 2px; letter-spacing: -0.3px; }
  .subtitle { color: #5a6b7b; font-size: 11pt; }
  .day { margin-top: 22px; }
  .day-head { font-size: 12pt; font-weight: 700; color: #0f6cbd;
              border-bottom: 1px solid #d7dee5; padding-bottom: 4px; margin-bottom: 10px; }
  .item { padding: 8px 0 8px 0; border-bottom: 1px dashed #e6ebf0; }
  .item:last-child { border-bottom: none; }
  .item-head { font-size: 11.5pt; font-weight: 700; }
  .icon { font-size: 12pt; }
  .route { color: #1d2733; font-weight: 600; }
  .time { color: #5a6b7b; font-weight: 600; white-space: nowrap; }
  .meta { color: #5a6b7b; font-size: 10pt; margin-top: 3px; }
  .meta b { color: #1d2733; font-weight: 600; }
  .review { display: inline-block; background: #fff4e5; color: #9a5b00;
            border: 1px solid #f0c98a; border-radius: 3px; padding: 0 5px;
            font-size: 8.5pt; font-weight: 600; margin-left: 6px; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #d7dee5;
           color: #8a98a6; font-size: 8.5pt; }
</style>
</head>
<body>
  <header>
    <h1>{{ title }}</h1>
    <div class="subtitle">{{ subtitle }}</div>
  </header>

  {% for day_label, day_items in days.items() %}
  <section class="day">
    <div class="day-head">{{ day_label }}</div>
    {% for it in day_items %}
    <div class="item">
      <div class="item-head">
        <span class="icon">{{ it.icon }}</span>
        {{ it.title }}
        {% if it.route %}<span class="route">· {{ it.route }}</span>{% endif %}
        {% if it.time %}<span class="time">· {{ it.time }}</span>{% endif %}
        {% if it.needs_review %}<span class="review">needs review</span>{% endif %}
      </div>
      {% if it.meta %}<div class="meta">{{ it.meta|safe }}</div>{% endif %}
    </div>
    {% endfor %}
  </section>
  {% endfor %}

  <footer>Generated {{ generated }} · {{ count }} item(s)</footer>
</body>
</html>
"""

_env = Environment(autoescape=True)


def _fmt_day(dt: Optional[datetime]) -> str:
    if dt is None:
        return "Unscheduled"
    return dt.strftime("%A, %-d %B %Y")


def _fmt_time(it: TripItem) -> str:
    start, end = it.start, it.end
    if start is None:
        return ""
    if start.hour == 0 and start.minute == 0:
        return ""
    s = start.strftime("%H:%M")
    if end and (end.hour or end.minute):
        return f"{s} – {end.strftime('%H:%M')}"
    return s


def _meta_html(it: TripItem) -> str:
    """Build the secondary detail line, omitting whatever's missing."""
    bits: list[str] = []
    if it.provider:
        bits.append(escape(it.provider))
    if it.description and it.description.lower() not in (it.title or "").lower():
        bits.append(escape(it.description))
    if it.location:
        bits.append(escape(it.location))
    if it.confirmation_number:
        bits.append(f"Ref <b>{escape(it.confirmation_number)}</b>")
    if it.seat:
        bits.append(f"Seat <b>{escape(it.seat)}</b>")
    if it.gate:
        bits.append(f"Gate <b>{escape(it.gate)}</b>")
    if it.passenger_name:
        bits.append(escape(it.passenger_name))
    if it.notes:
        bits.append(escape(it.notes))
    return " &nbsp;·&nbsp; ".join(bits)


def _route(it: TripItem) -> str:
    if it.origin and it.destination:
        return f"{it.origin} → {it.destination}"
    return it.origin or it.destination or ""


def _header(items: list[TripItem]) -> tuple[str, str]:
    """Derive a trip title and a date-range / destination subtitle."""
    dests = [it.destination for it in items if it.destination and it.category in
             {"flight", "train", "bus", "ferry"}]
    dest = max(set(dests), key=dests.count) if dests else None
    title = f"Trip to {dest}" if dest else "Your Trip"

    starts = [it.start for it in items if it.start]
    ends = [it.end for it in items if it.end] + starts
    if starts:
        lo = min(s.replace(tzinfo=None) for s in starts)
        hi = max(e.replace(tzinfo=None) for e in ends)
        if lo.date() == hi.date():
            subtitle = lo.strftime("%-d %B %Y")
        else:
            subtitle = f"{lo.strftime('%-d %b')} – {hi.strftime('%-d %b %Y')}"
    else:
        subtitle = "Itinerary"
    return title, subtitle


def build_pdf(items: list[TripItem]) -> bytes:
    """Render the given items to PDF bytes, grouped by day in order."""
    ordered = sorted_items(items)
    title, subtitle = _header(ordered)

    days: "OrderedDict[str, list[dict]]" = OrderedDict()
    for it in ordered:
        label = _fmt_day(it.start)
        days.setdefault(label, []).append(
            {
                "icon": it.icon,
                "title": it.title,
                "route": _route(it),
                "time": _fmt_time(it),
                "meta": _meta_html(it),
                "needs_review": it.needs_review,
            }
        )

    html = _env.from_string(_TEMPLATE).render(
        title=title,
        subtitle=subtitle,
        days=days,
        count=len(ordered),
        generated=datetime.now().strftime("%-d %b %Y %H:%M"),
    )
    return HTML(string=html).write_pdf()
