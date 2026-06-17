"""One-off credential check: confirms the Telegram token and Anthropic key work.

Reads tripbot/.env. Prints only safe metadata — never the secret values.
Safe to delete after use.
"""

import json
import os
import urllib.request

from dotenv import load_dotenv

load_dotenv()


def check_telegram() -> None:
    tok = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not tok:
        print("✗ Telegram: TELEGRAM_BOT_TOKEN not set")
        return
    url = "https://api.telegram.org/bot" + tok + "/getMe"
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            d = json.load(r)
    except Exception as e:  # noqa: BLE001
        print("✗ Telegram check failed:", type(e).__name__, e)
        return
    if d.get("ok"):
        u = d["result"]
        uname = u.get("username")
        print("✓ Telegram OK — bot @{} (id {}, name: {})".format(
            uname, u.get("id"), u.get("first_name")))
        print("  Open it: https://t.me/{}".format(uname))
    else:
        print("✗ Telegram returned not-ok:", d)


def check_anthropic() -> None:
    import anthropic

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("✗ Anthropic: ANTHROPIC_API_KEY not set")
        return
    try:
        c = anthropic.Anthropic()
        resp = c.messages.create(
            model="claude-opus-4-8",
            max_tokens=8,
            messages=[{"role": "user", "content": "reply with: ok"}],
        )
        txt = "".join(b.text for b in resp.content if b.type == "text").strip()
        print("✓ Anthropic OK — model {}, replied: {!r}".format(resp.model, txt))
    except anthropic.AuthenticationError:
        print("✗ Anthropic: invalid API key (401)")
    except anthropic.PermissionDeniedError as e:
        print("✗ Anthropic: permission/billing issue (403):", e)
    except Exception as e:  # noqa: BLE001
        print("✗ Anthropic check failed:", type(e).__name__, e)


if __name__ == "__main__":
    check_telegram()
    check_anthropic()
