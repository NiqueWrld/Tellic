"""
Pulls WhatsApp contacts from the Android device via ADB and saves to contacts.json.

Two-pass strategy (no root needed):

  Pass 1 — Saved WhatsApp contacts (Contacts Provider)
      WhatsApp registers each of your WhatsApp-enabled saved contacts with the
      Android Contacts Provider using its own mimetypes, e.g.
          vnd.android.cursor.item/vnd.com.whatsapp.profile
          vnd.android.cursor.item/vnd.com.whatsapp.w4b.profile
      We grab every raw_contact_id that has any com.whatsapp[.w4b]* mimetype,
      then resolve those to phone_v2 rows for name + number.

  Pass 2 — Unsaved WhatsApp chats (UI Automator scrape)
      Saved-only is all the Contacts Provider can expose. To capture unsaved
      numbers we open the WhatsApp HomeActivity, then repeatedly:
          uiautomator dump  ->  parse XML  ->  collect phone-number-shaped
          text / content-desc from chat rows
          input swipe       ->  next page
      Unsaved chats show their raw number as the row title, so we pick those up
      directly without having to open each conversation.

Usage:
    python Scripts/get_contacts.py
Output:
    contacts.json
"""

import json
import re
import subprocess
import time

# ADB device serial to target. Keep this in sync with your connected phone.
DEVICE  = "RF8Y10AWLYY"
OUTPUT  = "contacts.json"

# Android Contacts Provider mime type for phone number rows.
PHONE_MIMETYPE = "vnd.android.cursor.item/phone_v2"
# WhatsApp's mimetypes all share this prefix (covers com.whatsapp and com.whatsapp.w4b).
WHATSAPP_MIMETYPE_PREFIX = "vnd.android.cursor.item/vnd.com.whatsapp"

# Candidate WhatsApp packages, checked in order (Business preferred on this device).
WA_PACKAGES = ("com.whatsapp.w4b", "com.whatsapp")
HOME_ACTIVITY = "com.whatsapp.home.ui.HomeActivity"

# Remote path on the device for uiautomator dumps.
DUMP_PATH = "/sdcard/ui_dump.xml"


# ---------------------------------------------------------------------------
# ADB helpers
# ---------------------------------------------------------------------------

def adb(*args):
    """Run an adb command against DEVICE and return stdout (text)."""
    return subprocess.run(
        ["adb", "-s", DEVICE, *args],
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    ).stdout


def adb_shell(cmd):
    """Run a single shell command on the device and return stdout."""
    return adb("shell", cmd)


def normalize_number(n):
    """Strip spaces, dashes, parens, NBSPs. Preserve leading +."""
    return re.sub(r"[\s\-()\u00a0\u202f]", "", n)


# ---------------------------------------------------------------------------
# Pass 1 — Contacts Provider (saved WhatsApp contacts)
# ---------------------------------------------------------------------------

def query_data(projection):
    """Query the Android contacts data provider and return raw stdout lines."""
    out = adb("shell", "content", "query",
              "--uri", "content://com.android.contacts/data",
              "--projection", projection)
    return out.splitlines()


def parse_row(line):
    """Parse 'Row: N key=val, key=val, ...' into a dict."""
    body = re.sub(r"^Row:\s*\d+\s*", "", line)
    row = {}
    for m in re.finditer(r"(\w+)=(.*?)(?=,\s*\w+=|$)", body):
        k, v = m.group(1), m.group(2).strip()
        row[k] = None if v == "NULL" else v
    return row


def get_whatsapp_raw_contact_ids():
    """Return the set of raw_contact_id values that have any WhatsApp row."""
    whatsapp_ids = set()
    for line in query_data("raw_contact_id:mimetype"):
        if not line.startswith("Row:"):
            continue
        row = parse_row(line)
        mt = row.get("mimetype") or ""
        if mt.startswith(WHATSAPP_MIMETYPE_PREFIX):
            rid = row.get("raw_contact_id")
            if rid:
                whatsapp_ids.add(rid)
    return whatsapp_ids


def get_saved_whatsapp_contacts():
    """Return list of {name, numbers[]} for saved contacts that have WhatsApp."""
    print("[1/2] Querying device for saved WhatsApp contacts...")
    whatsapp_ids = get_whatsapp_raw_contact_ids()
    if not whatsapp_ids:
        print("      No WhatsApp-tagged saved contacts found.")
        return []

    print(f"      Found {len(whatsapp_ids)} WhatsApp-enabled raw contacts. "
          "Resolving phone numbers...")

    contacts = {}
    for line in query_data("display_name:data1:mimetype:raw_contact_id"):
        if not line.startswith("Row:"):
            continue
        row = parse_row(line)
        if row.get("mimetype") != PHONE_MIMETYPE:
            continue
        if row.get("raw_contact_id") not in whatsapp_ids:
            continue

        name   = (row.get("display_name") or "Unknown").strip()
        number = row.get("data1")
        if not number:
            continue
        number = normalize_number(number)

        if name not in contacts:
            contacts[name] = {"name": name, "numbers": []}
        if number not in contacts[name]["numbers"]:
            contacts[name]["numbers"].append(number)

    return list(contacts.values())


# ---------------------------------------------------------------------------
# Pass 2 — UI Automator (unsaved WhatsApp chats)
# ---------------------------------------------------------------------------

def detect_whatsapp_package():
    """Return the installed WhatsApp package name (w4b preferred), or None."""
    for pkg in WA_PACKAGES:
        out = adb_shell(f"pm path {pkg}")
        if "package:" in out:
            return pkg
    return None


def get_screen_size():
    """Return (width, height) of the device display."""
    out = adb_shell("wm size")
    m = re.search(r"(\d+)x(\d+)", out)
    if m:
        return int(m.group(1)), int(m.group(2))
    return 1080, 1920  # safe default


def launch_home(pkg):
    """Open WhatsApp's HomeActivity (the chat list)."""
    print(f"      Launching {pkg}/{HOME_ACTIVITY}...")
    adb_shell(f"am start -n {pkg}/{HOME_ACTIVITY}")
    time.sleep(2.0)


def ui_dump():
    """Trigger a uiautomator dump and return the XML text."""
    adb_shell(f"uiautomator dump {DUMP_PATH} >/dev/null 2>&1")
    return adb_shell(f"cat {DUMP_PATH}")


# Phone-number-shaped: optional +, then 7-15 digits (after stripping separators).
_PHONE_RE = re.compile(r"^\+?\d{7,15}$")

def extract_numbers_from_xml(xml_text):
    """Return a set of normalized numbers found in text= / content-desc= attrs."""
    found = set()
    for m in re.finditer(r'(?:text|content-desc)="([^"]*)"', xml_text):
        raw = m.group(1).strip()
        if not raw:
            continue
        candidate = normalize_number(raw)
        if _PHONE_RE.match(candidate):
            found.add(candidate)
    return found


def swipe_up(width, height):
    """Swipe from lower part of screen to upper to page the chat list."""
    x  = width // 2
    y1 = int(height * 0.80)
    y2 = int(height * 0.25)
    adb_shell(f"input swipe {x} {y1} {x} {y2} 300")


def scrape_unsaved_numbers(pkg, max_scrolls=60, stall_limit=3):
    """Scroll through the chat list collecting phone-number-shaped row labels."""
    print("[2/2] Scraping unsaved chat numbers via uiautomator...")
    launch_home(pkg)
    width, height = get_screen_size()

    collected = set()
    stalls = 0
    for i in range(max_scrolls):
        xml = ui_dump()
        if not xml.lstrip().startswith("<"):
            print("      uiautomator dump failed; aborting UI pass.")
            break
        new = extract_numbers_from_xml(xml)
        before = len(collected)
        collected |= new
        gained = len(collected) - before
        print(f"      scroll {i+1:>2}: +{gained} new (total {len(collected)})")

        if gained == 0:
            stalls += 1
            if stalls >= stall_limit:
                print("      No new numbers after several scrolls — done.")
                break
        else:
            stalls = 0

        swipe_up(width, height)
        time.sleep(0.6)

    return collected


# ---------------------------------------------------------------------------
# Merge + write
# ---------------------------------------------------------------------------

def merge_unsaved(contacts, unsaved_numbers):
    """Add unsaved numbers to contacts list if not already present anywhere."""
    known = set()
    for c in contacts:
        for n in c["numbers"]:
            known.add(normalize_number(n))

    added = 0
    for num in sorted(unsaved_numbers):
        if num in known:
            continue
        contacts.append({"name": num, "numbers": [num], "unsaved": True})
        known.add(num)
        added += 1
    return added


def main():
    saved = get_saved_whatsapp_contacts()

    pkg = detect_whatsapp_package()
    unsaved = set()
    if pkg:
        try:
            unsaved = scrape_unsaved_numbers(pkg)
        except Exception as e:
            print(f"      UI scrape failed: {e}")
    else:
        print("[2/2] WhatsApp not installed on device — skipping UI scrape.")

    added = merge_unsaved(saved, unsaved)

    if not saved:
        print("No contacts produced. Make sure WhatsApp is installed and USB debugging is authorised.")
        return

    saved.sort(key=lambda c: c["name"].lower())

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(saved, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(saved)} contacts to {OUTPUT} "
          f"({added} unsaved numbers added from chat list).")


if __name__ == "__main__":
    main()
